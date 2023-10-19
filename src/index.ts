import { Contact, Log } from '@core/types/events';
import { Call } from '@core/types/phone';

/**
 * REFERENCES
 * TRIAL: https://dynamics.microsoft.com/en-us/sales/sales-tool/free-trial/ https://dynamics.microsoft.com/en-us/dynamics-365-free-trial/
 * CIF: https://learn.microsoft.com/en-us/dynamics365/customer-service/channel-integration-framework
 */

const getCRMHost = () => new URL(location.href).searchParams.get('crm');

const setupOpenCti = () => {
  return new Promise<void>((resolve) => {
    const host = getCRMHost() ?? location.ancestorOrigins?.[0];
    const scriptSrc = `${host}/webresources/Widget/msdyn_ciLibrary.js`;

    // load dynamics 365 api script
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.type = 'text/javascript';
    script.onload = () => {
      logger('opencti ready');
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
  logger('CIFInitDone', evt);
});

setupOpenCti().then(() => {
  window.Brekeke.renderWidget(
    document.getElementById('widget_embed_div')!,
    ({
       fireCallInfoEvent,
       fireConfigEvent,
       fireLogSavedEvent,
       fireMakeCallEvent,
       fireNotification,
       onCallUpdatedEvent,
       onCallEndedEvent,
       onLoggedOutEvent,
       onLoggedInEvent,
       onCallEvent,
       onLogEvent,
       onContactSelectedEvent,
       onDuplicateContactCallAnsweredEvent,
     }) => {
      let clickData: ClickToActPayload | undefined;
      let currentCall: Call | undefined;
      let environment: Environment;
      const calls: string[] = [];

      const isClickedNumber = (number: string) => {
        if (!clickData) return false;
        const { value } = clickData;

        return [value, value.replace(/[^+\d]/g, '')].includes(number);
      };

      fireConfigEvent({
        logInputs: [
          {
            label: 'Subject',
            name: 'subject',
            type: 'text',
            required: true,
            defaultValue: call => `Call on ${new Date(call.createdAt).toUTCString()}`,
          },
          {
            label: 'Description',
            name: 'description',
            type: 'textarea',
          },
          {
            label: 'Result',
            name: 'result',
            type: 'text',
          },
        ],
      });

      // add click-to-call listener
      Microsoft.CIFramework.addHandler('onclicktoact', payload => {
        logger('onclicktoact', payload);
        const params = JSON.parse(payload) as ClickToActPayload;
        if (['account', 'contact'].includes(params.entityLogicalName)) clickData = params;
        fireMakeCallEvent(params.value);
      });

      onLoggedInEvent(() => {
        logger('logged in! enable click to act');
        void Microsoft.CIFramework.setClickToAct(true)
          .then(
            () => logger('click to act enabled'),
            () => logger('click to act enable failed'),
          );

        Microsoft.CIFramework.getEnvironment().then(res => {
          environment = JSON.parse(res);
          logger('environment', environment);
        });
      });

      onLoggedOutEvent(() => {
        currentCall = undefined;
        clickData = undefined;
        calls.length = 0;
        logger('logged out! disable click to act');
        void Microsoft.CIFramework.setClickToAct(false)
          .then(
            () => logger('click to act disabled'),
            () => logger('click to act disable failed'),
          );
      });

      onCallEvent(call => void (currentCall = call));
      onCallEndedEvent(call => {
        if (call.pbxRoomId === currentCall?.pbxRoomId) {
          currentCall = undefined;
        }

        if (isClickedNumber(call.partyNumber)) {
          clickData = undefined;
        }
      });

      onCallUpdatedEvent(call => {
        // logger('onCallEvent', call);
        logger('onCallUpdatedEvent', { ...call });

        const callId = `${call.pbxRoomId}-${call.id}`;
        if (calls.includes(callId)) return;
        calls.push(callId);

        // dock the panel
        void Microsoft.CIFramework.setMode(1);
        const phone = call.partyNumber;

        if (isClickedNumber(phone)) {
          const info: Contact = {
            id: clickData!.entityId,
            name: clickData!.recordTitle,
            type: clickData!.entityLogicalName,
          };
          logger('isClickedNumber', info);
          fireCallInfoEvent(call, info);

          return;
        }

        Promise.all([searchContacts(phone), searchAccounts(phone)])
          .then(([contact, account]) => {
            const allContacts = [...contact, ...account];

            logger('search', allContacts);

            if (allContacts.length > 0) {
              fireCallInfoEvent(call, allContacts);
              openRecord(allContacts[0].id, allContacts[0].type);
              return;
            }

            Microsoft.CIFramework.createRecord('contact', JSON.stringify({
              mobilephone: phone,
              firstname: 'Caller',
              lastname: phone,
            }))
              .then(value => {
                const record = JSON.parse(value);
                logger('createRecord', record);
                openRecord(record.id);
                fireCallInfoEvent(call, {
                  id: record.id,
                  name: `Caller ${phone}`,
                  type: 'contact',
                });
                // searchContacts(phone).then(contact => fireCallInfoEvent(call, contact));
              });
          })
          .catch(e => logger('search error', e));
      });

      onDuplicateContactCallAnsweredEvent(({ contact }) => contact && openRecord(contact.id, contact.type));

      onContactSelectedEvent(({ contact }) => openRecord(contact.id, contact.type));

      onLogEvent(log => {
        logger('logEvent', log);

        if (!log.contactId) {
          fireNotification({
            type: 'error',
            message: 'This call was not associated with a contact.',
          });
          return;
        }

        const call = log.call;
        const { subject, description, result } = log.inputs;

        Microsoft.CIFramework.createRecord(
          'phonecall',
          JSON.stringify({
            subject,
            description,
            new_result: result,
            new_recordingfile: log.recording?.url,
            directioncode: !call.incoming,
            phonenumber: call.partyNumber,
            actualdurationminutes: Math.trunc(log.duration / 1000 / 60),
            scheduledstart: new Date(call.createdAt),
            actualstart: new Date(call.answeredAt),
            actualend: new Date(call.answeredAt + log.duration),
            phonecall_activity_parties: [
              {
                participationtypemask: call.incoming ? 2 : 1,
                'partyid_systemuser@odata.bind': `/systemusers(${environment.userId.replace('{', '').replace('}', '')})`,
              },
              {
                participationtypemask: call.incoming ? 1 : 2,
                [`partyid_${log.contactType}@odata.bind`]: `/${log.contactType}s(${log.contactId})`,
              },
            ],

            // statecode: 'Completed',
          }),
        )
          .then(value => {
            fireLogSavedEvent(log);
            const record = JSON.parse(value);
            logger('createRecord', record);
          })
          .catch(reason => {
            logger('createRecord error', reason);
            const error = typeof reason === 'string' ? JSON.parse(reason) : reason;
            const message = error?.value?.errorMsg;
            if (message) fireNotification({ message, type: 'error' });
          });
      });
    },
  );
});

const mapContactResult = (contact: any): Contact => ({
  id: contact.contactid,
  name: contact.fullname,
  type: 'contact',
});

const mapAccountResult = (account: any): Contact => ({
  id: account.accountid,
  name: account.name,
  type: 'account',
});

const openRecord = (id: string, type: string = 'contact') => {
  logger('openRecord', { id, type });
  void Microsoft.CIFramework.searchAndOpenRecords(type, `?$filter=${type}id eq ${id}`, false)
    .then(response => logger('openRecord success', response))
    .catch(reason => logger('openRecord error', reason));
};

const wildcard = '%'; // %25
const formatSearchPhone = (phone: string) => {
  const search = phone.split('').join(wildcard);
  return wildcard + search + wildcard;
};

const searchContacts = (phone: string): Promise<Contact[]> => {
  const search = formatSearchPhone(phone);
  let query = `?$select=fullname,mobilephone&$filter=contains(mobilephone, '${search}') or contains(telephone1, '${search}')&$search=${phone}`;

  return Microsoft.CIFramework.searchAndOpenRecords('contact', query, true)
    .then(result => {
      logger('searchContacts', result);
      return Object.values(JSON.parse(result)).map(mapContactResult);
    });
};

const searchAccounts = (phone: string) => {
  const search = formatSearchPhone(phone);
  let query = `?$select=name,telephone1&$filter=contains(telephone1, '${search}')&$search=${phone}`;

  return Microsoft.CIFramework.searchAndOpenRecords('account', query, true)
    .then(result => {
      logger('searchAccounts', result);
      return Object.values(JSON.parse(result)).map(mapAccountResult);
    });
};

const logName = 'brekeke-widget:dynamics';
const logger = (...args: unknown[]) => {
  if (!location.host.startsWith('localhost') && !location.host.startsWith('127.0.0.1')) return;
  if (typeof args[0] === 'string' && args[0].includes('error')) {
    console.error(logName, ...args);
    return;
  }
  console.log(logName, ...args);
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
