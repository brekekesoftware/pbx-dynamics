# Microsoft Dynamics 365 Widget

Microsoft Dynamics 365 Integration for the PBX Widget.

## Usage

- Run the command `npm install` to install all the dependencies, then run `npm run build` to build the project.
- After building, copy the contents of the `dist` folder to a salesforce directory in your PBX webapps directory. EG `C:\Program Files\Brekeke\pbx\webapps\pbx\etc\widget\dynamics`
- Set your Dynamics 365 Channel Provider's Channel URL in the format `[PBX_URL]/pbx/etc/widget/dynamics/index.html?crm=[YOUR_DYNAMICS_URL]`
  Example if your PBX Domain is at https://brekeke.com, and dynamics instance is https://orgxyz.crm.dynamics.com
  The channel URL will be `https://brekeke.com/pbx/etc/widget/dynamics/index.html?crm=https://orgxyz.crm.dynamics.com`

## Integrate widget with dynamics instance.

1. Install and configure Channel Integration Framework
   - Login into Dynamic365 using admin account.
   - Go to Settings => Customizations => Microsoft AppSource.
   - ![Image](docs/widget/%231.png)
   - Find Channel integration in the search bar, double-click on the item and then install it by clicking GET IT NOW
   - ![Image](docs/widget/%232.png)
   - Accept the term and condition and remember to choose the targeted environment:
   - ![Image](docs/widget/%233.png)
   - After the installation, open the Channel Integration Framework app and create new channel providers:
   - ![Image](docs/widget/%234.png)
   - Fill the information like image below, and Channel URL as mentioned in the [usage](#usage) section.
   - ![Image](docs/widget/%235.png)
2. Configure Call Log Activity
   - Go to Settings => Customizations => Customizations => Customize the Systems
   - ![#6 settings menu.png](docs/widget/%236%20settings%20menu.png)
   - ![#7 customize system.png](docs/widget/%237%20customize%20system.png)
   - Go to Components => Entities and find Phone Call => Fields:
   - ![#8 phone fields.png](docs/widget/%238%20phone%20fields.png)
   - Add 2 new fields:
   - ![#9 recording file field.png](docs/widget/%239%20recording%20file%20field.png)
   - ![#10 result field.png](docs/widget/%2310%20result%20field.png)
   - Go to Forms of Phone call:
   - ![#11 phone call forms.png](docs/widget/%2311%20phone%20call%20forms.png)
   - Click on the form you want to change the display, which is Phone Call for Interactive experience form.
   - ![#12 phone call form.png](docs/widget/%2312%20phone%20call%20form.png)
   - Do the same thing with Result field if you want to display it in phone call activity page.

## Display audio recording in activity.

1. In the Phone Call for interactive experience Form, Click on Form Properties and follow the steps in the images below.
   ![Image 1](docs/recording/%231.png)
2. In form libraries section, click on add
   ![Image 2](docs/recording/%232.png)
3. Click on new
   ![Image 3](docs/recording/%233.png)
4. Fill in the values and upload the [script file](recordingFileAudioTag.js)
   ![Image 4](docs/recording/%234.png)
5. Then save and publish it
   ![Image 5](docs/recording/%235.png)
6. Select the newly installed script and click on add.
   ![Image 6](docs/recording/%236.png)
7. Then under Event handlers, make sure the control is Form, select onLoad event and click on add.
   ![Image 7](docs/recording/%237.png)
8. Select the newly installed library, input recordingFileAudioTag as the Function, enable it and also ensure you tick the "Pass execution context as first parameter" option.
   ![Image 8](docs/recording/%238.png)
9. In the dependencies tab, add Recording File field to the dependent fields section. Then click OK
   ![Image 9](docs/recording/%239.png)
10. Click OK
    ![Image 10](docs/recording/%2310.png)
11. Then save and publish changes.
    ![Image 11](docs/recording/%2311.png)
12. The Recording File field should now appear as an audio element.
    ![Image 12](docs/recording/%2312.png)
