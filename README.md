# Microsoft Dynamics 365 Widget

Microsoft Dynamics 365 Integration for the PBX Widget.

## Usage

- Run the command `npm install` to install all the dependencies, then run `npm run build` to build the project.
- After building, copy the contents of the `dist` folder to a salesforce directory in your PBX webapps directory. EG `C:\Program Files\Brekeke\pbx\webapps\pbx\etc\widget\dynamics`
- Set your Dynamics 365 Channel Provider's Channel URL in the format `[PBX_URL]/pbx/etc/widget/dynamics/index.html?crm=[CRM_URL]` EG `https://brekeke.com:8443/pbx/etc/widget/dynamics/index.html?crm=https://org.crm.dynamics.com`
