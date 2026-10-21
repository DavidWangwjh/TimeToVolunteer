// Development fixtures only. Pass to the login UI only for the allowlisted dev project.
export const DEV_LOGIN_PASSWORD = "password123";
export const DEV_ADMIN_EMAIL = "support@timetovolunteer.org";
export const DEV_SUPABASE_PROJECT_REF = "hdsevwlvtlpxjikynkof";

export const devQuickLoginGroups = [
          {
            role: "Admin",
            accounts: [
              {
                label: "Platform Admin",
                email: DEV_ADMIN_EMAIL,
                password: DEV_LOGIN_PASSWORD,
              },
            ],
          },
          {
            role: "Organizations",
            accounts: [
              {
                label: "Code Ninjas",
                email: "org.codeninjas@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
              {
                label: "Green City",
                email: "org.greencity@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
            ],
          },
          {
            role: "Volunteers",
            accounts: [
              {
                label: "Ava Martinez · Bronze",
                email: "ava.volunteer@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
              {
                label: "Ben Carter · Silver",
                email: "ben.volunteer@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
              {
                label: "Maya Johnson · Gold",
                email: "maya.volunteer@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
              {
                label: "Jordan Lee · Platinum",
                email: "jordan.volunteer@timetovolunteer.test",
                password: DEV_LOGIN_PASSWORD,
              },
              { label: "Riley Chen · Diamond", email: "riley.volunteer@timetovolunteer.test", password: DEV_LOGIN_PASSWORD },
            ],
          },
          {
    role: "Application review",
    accounts: [
      { label: "New Roots · Pending", email: "apply.newroots@timetovolunteer.test", password: DEV_LOGIN_PASSWORD },
      { label: "Service Lab · Contacted", email: "apply.servicelab@timetovolunteer.test", password: DEV_LOGIN_PASSWORD },
      { label: "Rejected · Resubmission", email: "apply.rejected@timetovolunteer.test", password: DEV_LOGIN_PASSWORD },
    ],
  },
];
