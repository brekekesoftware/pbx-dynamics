# Microsoft Dynamics 365 Widget

Microsoft Dynamics 365 Integration for the PBX Widget.

## Usage

- Run the command `npm install` to install all the dependencies, then run `npm run build` to build the project.
- After building, copy the contents of the `dist` folder to a salesforce directory in your PBX webapps directory. EG `C:\Program Files\Brekeke\pbx\webapps\pbx\etc\widget\dynamics`
- Set your Dynamics 365 Channel Provider's Channel URL in the format `[PBX_URL]/pbx/etc/widget/dynamics/index.html?crm=[YOUR_DYNAMICS_URL]`
  Example if your PBX Domain is at https://brekeke.com, and dynamics instance is https://orgxyz.crm.dynamics.com
  The channel URL will be `https://brekeke.com/pbx/etc/widget/dynamics/index.html?crm=https://orgxyz.crm.dynamics.com`
