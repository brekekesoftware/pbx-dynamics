import { Call } from '@core/types/phone';

const getCRMHost = () => new URL(location.href).searchParams.get('crm');

const setupOpenCti = () => {
  return new Promise<void>((resolve) => {
    const host = getCRMHost() ?? location.ancestorOrigins?.[0] ?? document.body.dataset['dynamics-host'];
    const scriptSrc = `${host}/webresources/Widget/msdyn_ciLibrary.js`;

    // load dynamics 365 api script
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.type = 'text/javascript';
    script.onload = () => {
      console.log('opencti ready');
      resolve();
    };

    script.dataset['crmurl'] = host;
    script.dataset['cifid'] = 'CIFMainLibrary';
    // script.setAttribute('data-crmurl', '');
    // script.setAttribute('data-cifid', 'CIFMainLibrary');

    document.head.appendChild(script);
  });
};

window.addEventListener('CIFInitDone', evt => {
  console.log('CIFInitDone', evt);
});

setupOpenCti().then(() => {
  window.Brekeke.renderWidget(
    document.getElementById('widget_embed_div')!,
    ({
       fireCallInfoEvent,
       fireLogSavedEvent,
       fireMakeCallEvent,
       onCallUpdatedEvent,
       onCallEndedEvent,
       onLoggedOutEvent,
       onLoggedInEvent,
       onCallEvent,
       onLogEvent,
     }) => {
      let clickData: ClickToActPayload | undefined;
      let currentCall: Call | undefined;
      let environment: Environment | undefined;

      // add click-to-call listener
      Microsoft.CIFramework.addHandler('onclicktoact', payload => {
        console.log('onclicktoact', payload);
        const params = JSON.parse(payload) as ClickToActPayload;
        clickData = params;
        fireMakeCallEvent(params.value);
      });

      onLoggedInEvent(() => {
        console.log('logged in! enable click to act');
        void Microsoft.CIFramework.setClickToAct(true)
          .then(
            () => console.log('click to act enabled'),
            () => console.log('click to act enable failed'),
          );

        Microsoft.CIFramework.getEnvironment().then(res => {
          environment = JSON.parse(res);
          console.log('environment', environment);
        });
      });

      onLoggedOutEvent(() => {
        currentCall = undefined;
        console.log('logged out! disable click to act');
        void Microsoft.CIFramework.setClickToAct(false)
          .then(
            () => console.log('click to act disabled'),
            () => console.log('click to act disable failed'),
          );
      });

      onCallUpdatedEvent(({ call }) => void (currentCall = call));
      onCallEndedEvent(({ call }) => {
        if (call.id === currentCall?.id) {
          currentCall = undefined;
        }

        if (clickData?.value === call.partyNumber) {
          clickData = undefined;
        }
      });

      const search = (call: Call, create = true) => {
        const phone = call.partyNumber;
        let query = `?$select=fullname,mobilephone&$filter=mobilephone eq '${phone}'&$search=${phone}`;

        Microsoft.CIFramework.searchAndOpenRecords('contact', query, false)
          .then(value => {
            const records = JSON.parse(value);
            console.log('searchAndOpenRecords', records);

            if (Object.keys(records).length > 0) {
              const record = records[0];
              fireCallInfoEvent(call, {
                id: record.contactid,
                name: record.fullname,
                type: 'contact',
              });
            } else if (create) {
              Microsoft.CIFramework.createRecord('contact', JSON.stringify({ mobilephone: phone }))
                .then(value => {
                  const record = JSON.parse(value);
                  console.log('createRecord', record);
                  search(call, false);
                });
            }
          });
      };

      onCallEvent(({ call }) => {
        console.log('onCallEvent', call);

        // dock the panel
        void Microsoft.CIFramework.setMode(1);

        if (call.partyNumber === clickData?.value) {
          fireCallInfoEvent(call, {
            id: clickData.entityId,
            name: clickData.recordTitle,
            type: clickData.entityLogicalName,
          });
        } else {
          search(call);
        }
      });

      onLogEvent(({ log }) => {
        console.log('logEvent', log);
        const call = log.call;

        Microsoft.CIFramework.createRecord(
          'phonecall',
          JSON.stringify({
            subject: log.subject,
            description: log.comment,
            new_result: log.result,
            directioncode: !call.incoming,
            phonenumber: call.partyNumber,
            actualdurationminutes: Math.trunc(log.duration / 1000 / 60),
            scheduledstart: new Date(call.createdAt),
            actualstart: new Date(call.answeredAt),
            actualend: new Date(call.answeredAt + log.duration),
            phonecall_activity_parties: [
              {
                participationtypemask: call.incoming ? 2 : 1,
                'partyid_systemuser@odata.bind': `/systemusers(${environment?.userId.replace('{', '').replace('}', '')})`,
              },
              {
                participationtypemask: call.incoming ? 1 : 2,
                [`partyid_${log.recordType}@odata.bind`]: `/${log.recordType}s(${log.recordId})`,
              },
            ],
            // new_recordingfile: `${log.tenant} ${call.pbxRoomId} ${log.user}`,

            // statecode: 'Completed',
          }),
        )
          .then(value => {
            fireLogSavedEvent(log);
            const record = JSON.parse(value);
            console.log('createRecord', record);
          });
      });
    },
  );
});

const formatRecordName = (name: string, type: string) => `[${type}] ${name}`;

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// {"value":"619-555-0129","name":"mobilephone","format":"Phone","entityLogicalName":"contact","entityId":"80ac35a0-01af-ea11-a812-000d3a8b3ec6","recordTitle":"Alex Baker"}
interface ClickToActPayload {
  value: string;
  name: string;
  format: string;
  entityLogicalName: string;
  entityId: string;
  recordTitle: string;
}

// {"appUrl":"https://org09b9d616.crm4.dynamics.com/main.aspx?appid=802b8bcd-710d-ee11-8f6d-002248803266","appid":"802b8bcd-710d-ee11-8f6d-002248803266","cifVersion":"9.2.0.49","clientUrl":"https://org09b9d616.crm4.dynamics.com","crmVersion":"9.2.23055.00200","customParams":null,"etn":"contact","id":"674f8695-1416-ee11-8f6d-000d3a4808bc","isDirty":false,"orgId":"ba7fd0b1-3511-ee11-a66b-000d3a48f47a","orgLcid":1033,"orgUniqueName":"unqba7fd0b13511ee11a66b000d3a48f","pagetype":"entityrecord","userId":"{A8177E6E-4D0D-EE11-8F6D-002248803266}","userLcid":1033,"username":"Akpesiri Okorigba"}
interface Environment {
  appUrl: string;
  appid: string;
  cifVersion: string;
  clientUrl: string;
  crmVersion: string;
  customParams: unknown;
  etn: string;
  id: string;
  isDirty: boolean;
  orgId: string;
  orgLcid: number;
  orgUniqueName: string;
  pagetype: string;
  userId: string;
  userLcid: number;
  username: string;
}
