// Key points for the plan steps whose id starts with d1 (kept from the 14-day plan; the number is not the day they sit on now). Data only. Keys are plan item ids from plan.js.
window.KEYS = window.KEYS || {};
Object.assign(window.KEYS, {
  d1a1: {
    head: "Create your AWS account",
    why: "You sign up with an old mailbox you rarely check and a password you also use on a shopping site. When that site leaks its passwords, a stranger can sign in to your AWS account and start servers on your card. Everything you build in AWS lives in an account, and whoever holds its first login controls all of it.",
    idea: "The email address and password you choose now become that login, the root user: the one identity with complete access to every service and resource in the account.",
    do: [
      "Open <b>aws.amazon.com</b> → click <b>Create an AWS Account</b>.",
      "Enter your normal email, if only you can open that mailbox, and a password you use nowhere else. Account name: anything, for example <code>stepan-lab</code>.",
      "If you get AWS's new sign-up (a Google, GitHub, Apple or Amazon login, with \"projects\" and \"AWS Settings\"), follow its screens. You then have a personal login from the start, and the admin-user block later on Day 1 does not apply."
    ],
    k: [
      ["Guard the mailbox", "“Forgot your password?” on the sign-in page sends the reset directions to the account's email address. So whoever can open that mailbox can reset the root user's password."]
    ],
    q: {
      q: "You have just created an AWS account with an email address and a password. What are those two now?",
      o: [
        "The root user's credentials: the one identity with complete access to every service and resource in the account",
        "The sign-in of an IAM user with read-only access, until you give it more permissions",
        "A login for the billing pages only, while AWS services need an IAM user to open",
        "A temporary login that AWS deletes once you create your first IAM user"
      ],
      a: [0],
      x: [
        "Right. The email address and password you choose when you create the account become the root user's credentials, with complete access to everything in it.",
        "The first login is not an IAM user, and it is not limited: it is the root user, with complete access.",
        "The root user can do everything in the account, the services included. Day 1 creates an admin user so you don't need it every day.",
        "AWS keeps the root user as long as the account exists. You stop using it day to day, and guard it with a strong password and MFA."
      ],
      dom: 1, tags: ["Root user & MFA"]
    },
    docs: [
      ["AWS account root user", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html"],
      ["Reset a lost or forgotten root user password", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reset-root-password.html"]
    ]
  },

  d1a2: {
    head: "Choose the Paid plan for this account",
    why: "You pick the Free plan because it sounds safe. Later Skill Builder won't sell you the subscription: it is billed to this AWS account, and an account on the Free plan can't buy it. So this plan needs an account that can be charged, and a way to keep those charges close to zero.",
    idea: "The Paid plan opens every AWS service and charges your card for what your credits don't cover. The budgets later today and the cleanup at the end of every build keep that close to zero.",
    do: [
      "When the sign-up asks for an account plan, choose <b>Paid plan</b>.",
      "You get the same sign-up credits as on the Free plan: $100, plus up to $100 more for onboarding tasks. Usage beyond them is charged to your card.",
      "Already on the Free plan? Console → <b>Upgrade plan</b> → <b>Upgrade account</b>. The credits you have left carry over to future bills."
    ],
    k: [
      ["What the Paid plan changes", "You can use all AWS services and features. Usage beyond your credit balance is charged at standard pay-as-you-go prices, and so is any service that credits do not apply to."],
      ["The account stays open", "A Free plan account closes when its credits are used up or its plan period ends. A Paid plan account stays open when the credits run out. From then on you pay for what you use."],
      ["What upgrades a Free plan by itself", "A Free plan account moves to the Paid plan automatically when it joins AWS Organizations or sets up an AWS Control Tower landing zone. A Paid plan account can do both freely."]
    ],
    trap: "Credits are not a spending limit. On the Paid plan nothing stops a resource you forgot from running, and the bill arrives once the credits are gone. A limit with a notification is AWS Budgets, which you set up later today.",
    q: {
      q: "Your Paid plan account still has $80 of sign-up credit, and a test instance you forgot keeps running for weeks. What happens once the credit is used up?",
      o: [
        "The account stays open and the instance keeps running, now charged to your card at standard prices",
        "AWS stops the instance, because a Paid plan account is never charged beyond its credits",
        "The account closes, and AWS keeps your resources for 90 days before deleting them",
        "AWS moves the account back to the Free plan until you buy more credits"
      ],
      a: [0],
      x: [
        "Right. A Paid plan account does not close when the credits run out. Usage beyond the credit balance is charged at standard pay-as-you-go prices.",
        "Credits are not a spending limit. On the Paid plan nothing stops a forgotten resource, so the charges move to your card.",
        "That is what happens to a Free plan account when its credits are used up. A Paid plan account stays open.",
        "Running out of credits doesn't change the plan. A Paid plan account stays open, and from then on you pay for what you use."
      ],
      dom: 4, tags: ["Cost management tools"]
    },
    docs: [["Choosing a plan (Free or Paid)", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html"], ["AWS Training FAQs (how the Individual subscription is billed)", "https://aws.amazon.com/training/faqs/"]]
  },

  d1a3: {
    head: "Add your card and verify your phone",
    why: "AWS lets you start servers minutes after sign-up and bills you afterwards. Without a working card and a real person behind the account, anyone could run servers that nobody pays for. So sign-up asks for both before the account opens.",
    idea: "Your card pays for whatever the credits don't cover. Your phone number proves who you are: AWS uses it to verify your identity and to confirm that the account is yours.",
    do: [
      "Enter your card details. AWS may place a small temporary hold on the card to verify it. Sign-up can't go on until a valid payment method is added.",
      "Enter a phone number you can reach in the next few minutes → <b>Send SMS</b>. Type the code you receive → <b>Continue</b>."
    ],
    k: [
      ["Use a phone you will keep", "You must be able to receive calls and SMS messages at this number. It is how AWS confirms that the account belongs to you."],
      ["A company account uses company contacts", "For a business, AWS advises a company phone number and a secured company mailbox, so the company keeps access when the person who signed up leaves."]
    ],
    q: {
      q: "An engineer opened her company's AWS account with her personal email address and personal mobile number, then left the company. Which choice at sign-up would have kept the company in control of the account?",
      o: [
        "A secured company mailbox as the account's email and a company phone number",
        "Root access keys for the account, kept in the company's password vault",
        "An IAM user for the engineer, with the AdministratorAccess policy",
        "The cheapest support plan, so that AWS calls the company instead"
      ],
      a: [0],
      x: [
        "Right. AWS advises company contacts for a business account, so access stays with the company when an employee leaves. The email can reset the root password, so it must be one the company controls.",
        "Root access keys are a risk and AWS advises against creating them. They also don't change who can recover the account through its email and phone.",
        "An IAM user helps with daily work, but the account's email and phone still belong to the engineer, and they decide who can recover the root user.",
        "The support plan has nothing to do with who owns the account's contact details."
      ],
      dom: 1, tags: ["Root user & MFA"]
    },
    docs: [["Sign up for AWS (advanced)", "https://docs.aws.amazon.com/accounts/latest/reference/getting-started.html"]]
  },

  d1a4: {
    head: "Pick the free support plan and finish sign-up",
    why: "The last sign-up page offers support plans that cost money every month and buy faster answers from AWS engineers. For a study account that runs nothing important, that money buys nothing you need. You need the free plan, and to know when the account is ready.",
    idea: "Basic Support is included for every AWS customer. Once you finish sign-up, AWS activates the account and sends you an email when it is ready.",
    do: [
      "Support plan: pick <b>Basic support (free)</b>.",
      "Choose <b>Complete sign up</b>. A page says that your account is being activated.",
      "Wait for the confirmation email, and look in the spam folder too. Activation usually takes a few minutes, but can take up to 24 hours."
    ],
    done: "The email that confirms your account is activated has arrived. You can now sign in to the AWS Management Console.",
    k: [
      ["What Basic Support includes", "24/7 customer service, the documentation, whitepapers and AWS re:Post. Also the core checks of AWS Trusted Advisor, and AWS Health."],
      ["Trusted Advisor and AWS Health", "Trusted Advisor's core checks guide you to set up resources by best practice, for performance and security. AWS Health alerts you when an AWS issue affects your resources."],
      ["What the paid plans add", "Business Support+, Enterprise Support and Unified Operations add response times from AWS engineers and the full set of Trusted Advisor checks. AWS calls Business Support+ the minimum for production workloads."]
    ],
    trap: "Basic Support gives only Trusted Advisor's core checks. A stem that needs the full set of checks, or a fast answer from an AWS engineer, needs a paid support plan.",
    q: {
      q: "Your study account has Basic Support and nothing else. Which of these do you get without paying for a support plan?",
      o: [
        "AWS Health alerts when an AWS issue affects your resources",
        "The full set of AWS Trusted Advisor checks",
        "An answer from an AWS engineer within an hour when production is down",
        "A designated technical account manager"
      ],
      a: [0],
      x: [
        "Right. Basic Support is included for all customers: customer service, documentation, re:Post, Trusted Advisor's core checks and AWS Health.",
        "Basic Support has only the core checks. The full set comes with a paid plan such as Business Support+.",
        "Response times from AWS engineers come with the paid plans: Business Support+, Enterprise Support and Unified Operations.",
        "A designated technical account manager is part of the higher paid plans, not Basic Support."
      ],
      dom: 4, tags: ["Cost management tools"]
    },
    docs: [
      ["Compare AWS Support plans", "https://aws.amazon.com/premiumsupport/plans/"],
      ["Sign up for AWS (advanced)", "https://docs.aws.amazon.com/accounts/latest/reference/getting-started.html"]
    ]
  },

  d1b1: {
    head: "Lock the root user with MFA",
    why: "A phishing page that looks like the AWS sign-in catches your root password. With that password alone the stranger can do anything in the account, including closing it. The root login needs a second proof that a stolen password can't give.",
    idea: "Multi-factor authentication (MFA) asks for a code or a passkey from a device you hold, on top of the password. AWS requires it on every root user, and gives you 35 days from the first console sign-in to register it.",
    do: [
      "Top right: your account name → <b>Security credentials</b> → <b>Assign MFA device</b>.",
      "Choose a passkey or an authenticator app and follow the screens. The root user can do anything, including closing the account, so MFA on it is mandatory.",
      "Register a second device the same way, so that a lost phone does not lock you out of the account."
    ],
    done: "When you next sign in as root, AWS asks for your passkey or a code from the app after the password.",
    k: [
      ["What only root can do", "Root is needed for a short list of tasks. In a standalone account these include closing the account and changing the root email address, root password or root access keys."],
      ["No root access keys", "Do not create access keys for the root user. Use a separate administrative user for everyday tasks, and sign in as root only for the tasks that require it."],
      ["Up to eight devices", "The root user can hold up to eight MFA devices of any supported type. AWS strongly recommends registering more than one."]
    ],
    trap: "'Rotate the root access keys every 90 days' and 'share the root password between admins' sound like good hygiene but are wrong. The right choices are MFA on root, no root access keys and a separate identity for daily work.",
    q: {
      q: "The only MFA device on your root user is your phone, and you are going away for a month. What does AWS recommend so that a lost phone can't lock you out?",
      o: [
        "Register a second MFA device, such as a passkey, on the root user",
        "Create root access keys and keep them as a way back in",
        "Turn MFA off on the root user until you are back",
        "Give a colleague the root password so they can sign in for you"
      ],
      a: [0],
      x: [
        "Right. The root user can hold up to eight MFA devices, and AWS strongly recommends more than one.",
        "AWS advises against root access keys altogether. They would be a long-lived way into the account that skips MFA.",
        "AWS requires MFA on the root user, and turning it off leaves the password as the only protection.",
        "Sharing the root password is the opposite of protecting it. Root is for one owner, and only for the tasks that need it."
      ],
      dom: 1, tags: ["Root user & MFA"]
    },
    docs: [
      ["Root user best practices", "https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html"],
      ["Tasks that require root user credentials", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html"]
    ]
  },

  d1b2: {
    head: "Work in one Region: Europe (Ireland)",
    why: "You build a server one evening. The next day the console opens in another Region, and the server seems gone, while it is still running and still costing money. Every resource you create lives in one Region, so you need one fixed place for all your work.",
    idea: "A Region is a separate geographic area of AWS. The console shows only the resources of the Region you have selected, so staying in eu-west-1 keeps everything you build in one view.",
    do: [
      "Top right: the Region selector → <b>Europe (Ireland) eu-west-1</b>.",
      "Use this Region for everything in this plan. Working in one Region avoids \"where did my resource go\", and forgotten resources that cost money."
    ],
    k: [
      ["Regions share nothing by themselves", "Regions are isolated from each other, and AWS does not copy resources between them automatically. The console lists only the resources of the selected Region."],
      ["Four factors pick a Region", "Compliance, latency to your users, the services and features you need, and price. A data residency rule overrides the other three."],
      ["When price decides", "Prices differ between Regions. Work that is not sensitive to latency, such as analytics, can run in the cheapest Region that has the services, if no residency rule applies."],
      ["Caching does not move data", "CloudFront keeps cached copies at edge locations near your users. The definitive version stays at the origin, in its Region."]
    ],
    trap: "A stem that names a law or a regulator fixes the Region, whatever the price or the list of services. Adding CloudFront does not change that: the definitive data stays at the origin in its Region.",
    q: {
      q: "A clinic's patient records must stay in Germany by law. The app's services all exist in Europe (Frankfurt), but US East (N. Virginia) would be cheaper. Where should the records be stored?",
      o: [
        "In Europe (Frankfurt), because the residency rule overrides price",
        "In US East (N. Virginia), because it is the cheapest Region with the services",
        "In US East (N. Virginia), with CloudFront caching the records near German users",
        "In whichever Region has the lowest latency to most of the clinic's patients"
      ],
      a: [0],
      x: [
        "Right. Compliance, latency, services and price decide a Region, and a data residency rule overrides the other three.",
        "Price only decides when no residency rule applies. Here the law fixes the country.",
        "Edge locations hold cached copies only. The definitive records would still sit at the origin in the US.",
        "Latency is one of the four factors, but a residency rule overrides it."
      ],
      dom: 1, tags: ["Regions & AZs"], doc: "regions"
    },
    docs: [
      ["Regions and Zones", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html"],
      ["What to consider when selecting a Region", "https://aws.amazon.com/blogs/architecture/what-to-consider-when-selecting-a-region-for-your-workloads/"],
      ["What is Amazon CloudFront?", "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html"]
    ]
  },

  d1c1: {
    head: "One sign-in for many people and many accounts",
    why: "A company has 200 engineers and 30 AWS accounts, with an IAM user per person in each account. When an engineer leaves, working logins stay behind in a dozen accounts until someone finds and deletes each one. People need one login that reaches every account they may use, managed in one place.",
    idea: "IAM Identity Center is the AWS service for workforce access. People sign in once at the AWS access portal and reach every account and application assigned to them.",
    k: [
      ["Where the users come from", "Users can live in Identity Center's own directory or be synchronized from an identity provider the company already has. That gives one point of federation for all its accounts."],
      ["Temporary credentials", "Access works by assuming a role, so people get temporary credentials. AWS recommends this for human users instead of IAM users with long-term access keys."],
      ["It needs an organization", "Access to AWS accounts needs an organization instance. In a standalone account, enabling one creates an AWS Organization with your account as its management account. An account instance can't give access to accounts."],
      ["Not for your app's customers", "Amazon Cognito is the identity platform for the users of your own web and mobile apps. IAM Identity Center is for the workforce: people who work in your AWS accounts."]
    ],
    trap: "When a stem describes employees who need access to several AWS accounts, Cognito is the distractor and IAM Identity Center the answer. Customers signing in to your own mobile app are the reverse.",
    q: {
      q: "A contractor's project touched nine of a company's AWS accounts. When the contract ends, the company wants to remove all of the contractor's access with one change. Which setup makes that possible?",
      o: [
        "A user in IAM Identity Center, with access to the nine accounts assigned centrally",
        "An IAM user in each of the nine accounts, all with the same password",
        "A user in an Amazon Cognito user pool, shared by all nine accounts",
        "One shared IAM user per team, whose password is changed when someone leaves"
      ],
      a: [0],
      x: [
        "Right. Identity Center gives each person one sign-in for every account assigned to them, so removing that one user ends all of it.",
        "Nine IAM users are nine logins to find and delete, which is exactly the problem Identity Center solves.",
        "Cognito is for the users of your own web and mobile apps, not for people who work in AWS accounts.",
        "A shared login hides who did what, and changing its password locks out the whole team."
      ],
      dom: 1, tags: ["IAM Identity Center & federation"], doc: "identity-center"
    },
    docs: [
      ["What is IAM Identity Center?", "https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html"],
      ["Enable IAM Identity Center", "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html"],
      ["Security best practices in IAM", "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"]
    ]
  },

  d1u1: {
    head: "Create your everyday login: an IAM user",
    why: "You sign in as root every evening to study. Then every slip, and every leaked password, hits the identity that can do anything, including closing the account. Daily work needs a personal login of its own, so that root can stay locked away.",
    idea: "An IAM user is an identity inside one account, with its own long-lived password. For one person and one account it is the simplest login.",
    do: [
      "IAM → <b>Users</b> → <b>Create user</b> → your user name.",
      "Tick <b>Provide user access to the AWS Management Console</b> → <b>I want to create an IAM user</b> → set a password.",
      "No way to create a user with console access? Then you are on AWS's new experience and already sign in with a personal login: mark this block complete."
    ],
    k: [
      ["Federation first for people", "AWS recommends that people sign in through federation with temporary credentials. IAM users are for the cases federation does not cover. Companies use IAM Identity Center (Day 5)."],
      ["Only the credentials needed", "Create only the credentials a user needs. Someone who works only in the console gets a password and no access keys."]
    ],
    trap: "On the exam an IAM user per person is usually the distractor. For employees the expected answer is IAM Identity Center or federation with temporary credentials. You use an IAM user here because it is the simplest login for one person and one account.",
    q: {
      q: "A new colleague will work only in the AWS Management Console, never in the CLI. Which credentials should her IAM user get?",
      o: [
        "A console password and no access keys",
        "A console password and an access key, in case she needs the CLI later",
        "An access key only, because keys are harder to guess than passwords",
        "The root user's access key, copied to her user"
      ],
      a: [0],
      x: [
        "Right. Create only the credentials a user needs. Someone who works only in the console gets a password and no access keys.",
        "An access key she doesn't use is one more long-lived credential that can leak. Create it only when it is needed.",
        "An access key doesn't let anyone sign in to the console, and it is a long-lived credential too.",
        "Root access keys should never exist, and they cannot be copied to an IAM user."
      ],
      dom: 1, tags: ["IAM policies"]
    },
    docs: [
      ["Create an IAM user in your AWS account", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html"],
      ["Security best practices in IAM", "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"]
    ]
  },

  d1u2: {
    head: "Give your user admin rights through a group",
    why: "Over months you attach a permission here and a policy there, user by user. Then nobody can say who may do what, and taking rights away means checking every user. Permissions should be defined once per job and handed out by membership.",
    idea: "An IAM group holds the permissions, in policies attached to it, and its members get them. So even your single admin user goes into an <code>Admins</code> group.",
    do: [
      "<b>Set permissions</b> → <b>Add user to group</b> → <b>Create group</b>: name it <code>Admins</code> and tick the <b>AdministratorAccess</b> policy.",
      "Select the new group → <b>Create user</b>.",
      "Keep the last page open for the next two steps."
    ],
    done: "The last page shows the console sign-in URL, the user name and the password.",
    k: [
      ["Groups carry the permissions", "AWS recommends putting IAM users in groups and attaching the policies to the groups. When a person changes jobs, you move them to another group instead of editing their permissions."],
      ["A boundary limits, a group grants", "A permissions boundary sets the most a user may be allowed, and grants nothing by itself. A policy attached to a group does grant."]
    ],
    q: {
      q: "Six developers need the same permissions, and people join and leave the team every month. How does AWS recommend giving them those permissions?",
      o: [
        "Put the developers in an IAM group and attach the policies to the group",
        "Attach the same policies to each developer's user, one by one",
        "Give each developer a permissions boundary that lists the permissions",
        "Let the developers share one IAM user that has the permissions"
      ],
      a: [0],
      x: [
        "Right. The group holds the permissions once. A newcomer is added to the group, and a leaver is removed from it.",
        "This works at first, but the users drift apart, and every change must be repeated for each person.",
        "A permissions boundary grants nothing by itself: it only caps what other policies allow.",
        "A shared login hides who did what, and everyone's access ends when its password changes."
      ],
      dom: 1, tags: ["IAM policies"]
    },
    docs: [
      ["Create an IAM user in your AWS account", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html"],
      ["IAM user groups", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups.html"]
    ]
  },

  d1u3: {
    head: "Put MFA on your admin user too",
    why: "Your admin password gets typed into a fake sign-in page. With it alone, the attacker has administrator access to the whole account. An administrator without MFA is one leaked password away from a hijacked account.",
    idea: "MFA on the IAM user asks for a one-time code or a passkey at every sign-in, so a stolen password is not enough on its own.",
    do: [
      "Open the new user → <b>Security credentials</b> → <b>Assign MFA device</b>.",
      "Type a device name and choose a passkey or <b>Authenticator app</b>. For an app: <b>Show QR code</b>, then scan it with the app.",
      "Type the app's current code into <b>MFA code 1</b>. Wait up to 30 seconds for the next one, type it into <b>MFA code 2</b> → <b>Add MFA</b>."
    ],
    done: "Your next sign-in as this user asks for a code or your passkey after the password.",
    k: [
      ["Passkeys protect best", "AWS recommends passkeys or security keys for the strongest protection against phishing. An authenticator app is the choice when you can't use those yet."],
      ["Register more than one", "AWS recommends more than one MFA device, so that losing or breaking one does not lock you out."],
      ["Submit the codes at once", "App codes expire after a short time. If you wait too long before Add MFA, the device is added but out of sync, and you must resync it."]
    ],
    q: {
      q: "An attacker has phished the password of an IAM user with administrator access. Which control, set up beforehand, would still have kept the attacker out of the console?",
      o: [
        "MFA on that user, which asks for a one-time code or a passkey at sign-in",
        "A rule that the user's password is changed every 90 days",
        "Moving the user from the Admins group into a group of its own",
        "A permissions boundary attached to the user"
      ],
      a: [0],
      x: [
        "Right. With MFA a stolen password is not enough: the attacker would also need the code or the passkey from the user's device.",
        "A rotation rule doesn't stop someone who already has the current password.",
        "Groups decide permissions, not sign-in. The attacker would still get in, with that group's permissions.",
        "A boundary caps permissions and does nothing at sign-in, so the attacker still gets in."
      ],
      dom: 1, tags: ["Root user & MFA"], doc: "iam-mfa"
    },
    docs: [["Assign a virtual MFA device in the console", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html"]]
  },

  d1u4: {
    head: "Save your sign-in URL and switch to your admin user",
    why: "You open the AWS sign-in page as an IAM user, and it asks which account you mean. The account ID is a long number you never wrote down. An IAM user belongs to one account, so its sign-in needs the account first.",
    idea: "Your account's own sign-in URL carries the account ID, so it opens the right sign-in page directly. Saved in this app, it also makes the Open buttons take you there.",
    do: [
      "Copy the <b>console sign-in URL</b> (<code>https://&lt;account-id&gt;.signin.aws.amazon.com/console</code>) into ⚙ Settings here.",
      "Sign out of root. Open the URL and sign in as your new user, with its password and an MFA code.",
      "From now on root is for emergencies only. The Open buttons for ③ take you to your own sign-in page."
    ],
    k: [
      ["Three things to sign in", "An IAM user signs in with the account ID or account alias, the user name and the password. The sign-in URL carries the first of them."],
      ["An alias instead of the ID", "You can give the account an alias and use it in place of the ID: <code>https://alias.signin.aws.amazon.com/console</code>."],
      ["Bookmark it by hand", "Type the URL into a bookmark yourself. AWS warns that the browser's bookmark button can save a redirected address instead of your sign-in URL."]
    ],
    q: {
      q: "You now sign in every day as an IAM admin user with MFA. When should you still sign in as the root user?",
      o: [
        "Only for the few tasks that require root, such as closing the account or changing its root email address",
        "For every change to IAM users, groups and policies",
        "Once a week, so that the root password does not expire",
        "Whenever your admin user's MFA code is slow to arrive"
      ],
      a: [0],
      x: [
        "Right. Root is needed for a short list of tasks only. AWS advises keeping it out of everyday use.",
        "Your admin user has the AdministratorAccess policy and can manage IAM. That is daily work, not a root task.",
        "Nothing requires regular root sign-ins. The fewer times root is used, the fewer chances there are to expose it.",
        "Convenience is not a reason to use the identity that can do anything. Fix the MFA device instead."
      ],
      dom: 1, tags: ["Root user & MFA"]
    },
    docs: [["How IAM users sign in to AWS", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_sign-in.html"]]
  },

  d1c3: {
    head: "Permission sets: one definition of a job's access",
    why: "The administrator job needs the same rights in each of a company's 30 accounts. Building a matching role by hand in every account takes days, and the copies drift apart with every later fix. A job's access must be written once and kept the same everywhere.",
    idea: "A permission set is that definition: a template of one or more IAM policies. When it is assigned in an account, Identity Center creates a role there from it.",
    k: [
      ["It grants nothing alone", "A permission set gives no access until it is assigned to a user or group for a specific account."],
      ["It becomes a role", "On assignment, Identity Center creates an IAM role in that account, attaches the set's policies and lets the assigned users assume it. Edit the set and those roles are updated for you."],
      ["How long a session lasts", "Session duration is a property of the permission set: one hour by default, 12 hours at most."],
      ["Least privilege at sign-in", "AWS suggests a narrower set such as PowerUserAccess next to AdministratorAccess. At sign-in you pick the least privileged one that can do the task."]
    ],
    trap: "A permission set is not a group. A group collects users, and a permission set describes what they may do in an account. The permission set is what becomes the role you assume there.",
    q: {
      q: "The database administrators' job needs one extra managed policy in all 30 accounts where it is used. The company uses IAM Identity Center. How much work is that?",
      o: [
        "One edit to the job's permission set, and the roles built from it change with it",
        "One edit per account, in the role that was made there for the job",
        "A new permission set, then a new assignment in each of the 30 accounts",
        "One edit to the group of administrators, which then carries the new policy"
      ],
      a: [0],
      x: [
        "Right. Identity Center builds the role in each account from the permission set, and updates those roles when you edit the set.",
        "Hand edits per account are what permission sets replace, and they let the copies drift apart.",
        "The existing set and its assignments can stay. Editing the set is enough.",
        "In Identity Center a group collects users. What they may do in an account is in the permission set."
      ],
      dom: 1, tags: ["IAM Identity Center & federation"], doc: "identity-center"
    },
    docs: [
      ["Manage AWS accounts with permission sets", "https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html"]
    ]
  },

  d1c4: {
    head: "Assignments: who gets which access in which account",
    why: "A user exists, a permission set exists, and still the user can't open the production account. Nothing yet says that this person, in that account, gets that access. Access needs an explicit link, one you can change in one place when people move.",
    idea: "An assignment is that link: a user or group, an AWS account and a permission set. Access exists only for that combination.",
    k: [
      ["Assign to groups", "AWS recommends assigning access to groups rather than to individual users. A person who changes teams moves to another group and gets that group's access, with nothing to edit per user."],
      ["One set, many accounts", "The same permission set can be assigned in many accounts, and one user can hold several sets in one account."],
      ["Several roles to choose from", "Each set a user holds in an account appears in the access portal as a separate role to choose at sign-in."]
    ],
    trap: "For many engineers and several accounts, the wrong options create IAM users with access keys in every account, or one shared user per team. Central assignment of permission sets from Identity Center is the low-overhead answer.",
    q: {
      q: "An engineer moves from the data team to the web team. Both teams are groups in IAM Identity Center, each with its own assignments. What is the least-effort change?",
      o: [
        "Move the engineer from the data group to the web group",
        "Add the web team's policies to the data team's permission set",
        "Create a new assignment for the engineer in each of the web team's accounts",
        "Create IAM users for the engineer in the web team's accounts"
      ],
      a: [0],
      x: [
        "Right. With access assigned to groups, the engineer gets the web group's access and loses the data group's, with nothing to edit per user.",
        "That would give the whole data team the web team's access.",
        "This works, but it is per-user work that group assignments already do.",
        "IAM users in each account bring back the separate logins that Identity Center replaces."
      ],
      dom: 1, tags: ["IAM Identity Center & federation"], doc: "identity-center"
    },
    docs: [
      ["Manage AWS accounts with permission sets", "https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html"],
      ["Assign user or group access to AWS accounts", "https://docs.aws.amazon.com/singlesignon/latest/userguide/assignusers.html"]
    ]
  },

  d1c5: {
    head: "The access portal: credentials that expire by themselves",
    why: "An engineer keeps an access key in a file on a laptop for years. The laptop is stolen, and the key works for whoever finds it until someone deletes it. People need credentials that run out by themselves.",
    idea: "In the AWS access portal a person signs in at one URL, picks an account and a role, and gets temporary credentials for the console and the CLI.",
    k: [
      ["The CLI with Identity Center", "<code>aws configure sso</code> creates a profile. <code>aws sso login</code> then gets temporary credentials through Identity Center, so its users need no long-term access keys."],
      ["The session ends on its own", "The credentials last as long as the permission set's session duration allows. After that the person signs in again."]
    ],
    trap: "When a stem asks for short-lived credentials, an IAM user with administrator access keys is wrong even though it works. So are root access keys. An Identity Center user with a permission set is the match.",
    q: {
      q: "A developer at a company that uses IAM Identity Center needs the AWS CLI for one account. Which setup leaves no long-term access key on the laptop?",
      o: [
        "<code>aws configure sso</code> for a profile, then <code>aws sso login</code> for temporary credentials",
        "An IAM user's access key, saved with <code>aws configure</code>",
        "The root user's access key, kept in an encrypted file",
        "An IAM user's access key that is rotated every 90 days"
      ],
      a: [0],
      x: [
        "Right. The profile points at Identity Center, and <code>aws sso login</code> fetches temporary credentials for the chosen role.",
        "An IAM user access key is a long-term credential stored on the laptop.",
        "Root access keys should never exist, encrypted or not.",
        "Rotation shortens a key's life, but it is still a long-term key on disk between rotations."
      ],
      dom: 1, tags: ["IAM Identity Center & federation"], doc: "identity-center"
    },
    docs: [
      ["Configuring IAM Identity Center authentication with the AWS CLI", "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html"],
      ["Manage AWS accounts with permission sets", "https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html"]
    ]
  },

  d1d1: {
    head: "Get an email the first time the account costs money",
    why: "A test server you forgot runs all month. You find out when the bill arrives, weeks after the money was spent. You need an alarm that speaks up the first time the account costs anything.",
    idea: "AWS Budgets compares your spending with a limit you set and notifies you when you cross it, or are forecast to. The zero spend budget template notifies you once spending goes beyond the AWS Free Tier limits.",
    do: [
      "Billing and Cost Management → <b>Budgets</b> → <b>Create budget</b> → <b>Use a template</b> → <b>Zero spend budget</b>.",
      "Enter your email → <b>Create budget</b>. It emails you the first time anything costs money beyond credits and free usage."
    ],
    k: [
      ["Alerts can lag by hours", "Budgets works from billing data that is updated at least once a day. An alert can arrive hours after the spending began."],
      ["Actual or forecasted", "A budget can alert on actual spend, already accrued, or on forecasted spend. It notifies email addresses, an Amazon SNS topic or both."],
      ["Other cost tools", "Cost Explorer is for viewing, analyzing and forecasting your costs. Cost Anomaly Detection uses machine learning to spot unusual spending patterns."],
      ["Forecasts need history", "AWS needs about five weeks of usage data before it can forecast. So a new account relies on alerts on actual spend."],
      ["Budget actions", "To go beyond an alert. At a threshold an action can apply an IAM policy or a service control policy, or target specific EC2 or RDS instances, automatically or after your approval."]
    ],
    trap: "A fixed limit with a notification, or with an automatic action, points to AWS Budgets. Cost Explorer only shows and forecasts costs, and Cost Anomaly Detection only spots unusual patterns.",
    q: {
      q: "Your AWS account is two days old. You set a budget that alerts on forecasted spend, and it stays silent while real charges grow. Why?",
      o: [
        "AWS needs about five weeks of usage data before it can forecast, so a new account needs an alert on actual spend",
        "Forecast alerts can only go to an Amazon SNS topic, not to an email address",
        "Budgets ignore all charges until the first monthly bill is issued",
        "A forecast alert works only when a budget action is attached to it"
      ],
      a: [0],
      x: [
        "Right. Forecasts need about five weeks of history. Until then, alerts on actual spend are the ones that fire.",
        "Budget alerts can go to email addresses, an SNS topic or both.",
        "Budgets use billing data that is updated at least once a day, not only at the monthly bill.",
        "Actions are optional. An alert on its own notifies you without any action."
      ],
      dom: 4, tags: ["Cost management tools"], doc: "budgets"
    },
    docs: [
      ["Using a budget template (simplified)", "https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html"],
      ["Configuring budget actions", "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html"],
      ["Best practices for AWS Budgets", "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html"]
    ]
  },

  d1d3: {
    head: "A second budget for anything beyond the subscription",
    why: "The subscription is charged, and the zero spend budget sends its email. Two weeks later a forgotten NAT gateway starts costing money, and no second email comes. You need an alarm that stays awake after the first charge.",
    idea: "A monthly cost budget set a few dollars above the subscription notifies you when spending passes it, or is forecast to. Any alert from it means something new is running.",
    do: [
      "<b>Create budget</b> again → <b>Use a template</b> → <b>Monthly cost budget</b>.",
      "Amount: a few dollars above your subscription's monthly charge (35, say, if the charge is 29). Add your email → <b>Create budget</b>.",
      "When the subscription's charge shows under <b>Bills</b>, set the amount to that charge plus a few dollars."
    ],
    done: "Budgets lists two budgets: the zero spend budget and your monthly cost budget.",
    k: [
      ["One actual alert per month", "An alert on actual spend is sent only once per budget and budget period, when the threshold is first reached. So the zero spend budget goes quiet once the subscription is charged."],
      ["Forecast alerts can repeat", "A forecast alert can come more than once in a period, if the forecast rises above the threshold, falls below it and rises again."]
    ],
    q: {
      q: "Your zero spend budget emailed you on the 3rd, when the subscription was charged. On the 20th a forgotten instance starts costing money. Will that budget email you again this month?",
      o: [
        "No. An actual-spend alert fires once per budget period, so a second budget above the known charge must catch it",
        "Yes. A zero spend budget emails on every new charge",
        "Yes, as soon as the instance has run for 24 hours",
        "No, because a budget stops for good after its first alert until you create it again"
      ],
      a: [0],
      x: [
        "Right. Actual alerts are sent once per budget per period, when the threshold is first reached. A monthly cost budget above the subscription stays able to fire.",
        "After the first alert of the period, an actual-spend alert stays quiet until the next period.",
        "Running time doesn't matter: the alert for this period has already been sent.",
        "The budget is not broken. It alerts again in the next budget period."
      ],
      dom: 4, tags: ["Cost management tools"], doc: "budgets"
    },
    docs: [["Best practices for AWS Budgets", "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html"], ["Using a budget template (simplified)", "https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html"]]
  },

  d1d2: {
    head: "Know how much credit you have left",
    why: "Your sign-up credits quietly pay for your mistakes, so the card is never charged and nothing looks wrong. Then they run out or expire, and the next bill lands on your card. You need to know how much credit is left and when it ends.",
    idea: "The Credits page lists each credit with its remaining amount and its expiration date. AWS applies credits to your bills by itself until they are used up or expire.",
    do: [
      "Search <b>Billing and Cost Management</b> → <b>Credits</b>. Note your credit balance (<b>Amount remaining</b>) and the expiry date.",
      "Check this page every few days."
    ],
    k: [
      ["The balance is a month behind", "Amount remaining is updated at the end of each billing cycle. Credit used this month shows there only after the month closes."],
      ["This month's estimate", "Open a credit to see its estimated amount remaining, updated daily. The Bills page shows the estimated balance on its Savings tab."],
      ["Which credit goes first", "With several credits, the one that expires soonest is applied first."],
      ["Credits cover named services", "Each credit lists the products it applies to. Use of other services is charged to your card."]
    ],
    q: {
      q: "On the 10th you open the Credits page. Its Amount remaining is the same as at the start of the month, although you have used services since. Why?",
      o: [
        "Amount remaining is updated at the end of each billing cycle; the credit's estimated amount remaining is updated daily",
        "Credits are only applied after you have paid the month's bill",
        "AWS charges your card first and refunds from the credits at the end of the year",
        "The Credits page lists only credits that have already expired"
      ],
      a: [0],
      x: [
        "Right. The column lags until the billing cycle closes. For this month, open the credit for its daily estimate, or see the Bills page, Savings tab.",
        "Credits are applied to the bill automatically. You don't pay first.",
        "Credits are applied to eligible charges as each bill is made, not refunded later.",
        "The page shows active credits with their remaining amount and expiration date."
      ],
      dom: 4, tags: ["Cost management tools"]
    },
    docs: [["Applying AWS credits", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html"], ["Choosing a plan (Free or Paid)", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html"]]
  },

  d1e3: {
    head: "Enroll in the Exam Prep Plan now, for later",
    why: "You can finish every course and still meet the exam cold: you have never seen how its questions are worded, or how long 65 of them take. Exam practice needs a plan of its own, ready for the days you need it.",
    idea: "AWS's Exam Prep Plan for SAA-C03 is that plan. Enrolling today puts it under My training next to the Solutions Architect plan, so Day 10 starts it with one click.",
    k: [
      ["The exam itself is separate", "The Individual subscription covers self-paced digital training, exam prep included. The certification exam is not part of it: you book and pay for it separately."]
    ],
    q: {
      q: "Your Skill Builder Individual subscription is active. Which part of getting certified does it not cover?",
      o: [
        "The certification exam, which you book and pay for separately",
        "The Official Practice Exam",
        "Domain Practice for each exam domain",
        "The labs of the Solutions Architect learning plan"
      ],
      a: [0],
      x: [
        "Right. The Individual subscription gives self-paced digital training. AWS Certification exams are not included.",
        "The Official Practice Exam is one of the things the subscription is needed for.",
        "Domain Practice is one of the things the subscription is needed for.",
        "The subscription opens the plan's paid trainings: 27 of its 36 need it."
      ]
    },
    docs: [["AWS Training FAQs (what the Individual subscription includes)", "https://aws.amazon.com/training/faqs/"]]
  },

  d1c6: {
    head: "Region, Availability Zone or edge location",
    why: "Your shop runs in one data center. When its power fails, the shop goes dark, and customers on another continent were already waiting seconds for every page. Each of these problems is solved at a different level of AWS's map, and the stem tells you which.",
    idea: "A Region decides where your data lives. A second Availability Zone in the same Region survives the loss of a data center. Edge locations hold cached copies close to users.",
    k: [
      ["AZ names or AZ IDs", "An AZ name such as us-east-1a can point to different physical zones in different accounts (older Regions, accounts created before November 2025). To line up resources across accounts, compare AZ IDs such as <code>use1-az1</code>."]
    ],
    trap: "Decide which failure the stem describes. A data center or AZ failure is solved inside one Region with a second AZ. Residency or a Regional outage is a Region decision. An edge location holds cached copies and is not a place to run EC2 instances.",
    q: {
      q: "A retailer's web servers all run in one Availability Zone, and an outage of that zone took the shop down for hours. Its data must stay in the same country. What is the most suitable change?",
      o: [
        "Run the servers in a second Availability Zone of the same Region",
        "Move all servers to a Region in another country",
        "Serve the shop from edge locations instead of servers",
        "Replace the servers with larger instances in the same zone"
      ],
      a: [0],
      x: [
        "Right. Losing a data center or an AZ is solved inside one Region, by spreading the servers over a second AZ.",
        "A second Region answers a Regional outage or a residency need. It is more than this failure calls for, and it may break the country rule.",
        "Edge locations hold cached copies. They are not a place to run the shop's servers.",
        "Bigger servers in the same zone fail together with that zone."
      ],
      dom: 2, tags: ["Regions & AZs"], doc: "regions"
    },
    docs: [
      ["Regions and Zones", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html"],
      ["AZ IDs", "https://docs.aws.amazon.com/global-infrastructure/latest/regions/az-ids.html"],
      ["AWS Regions and Availability Zones", "https://aws.amazon.com/about-aws/global-infrastructure/regions_az/"]
    ]
  },

  d1c7: {
    head: "Paying for EC2: On-Demand, commitments, Spot or your own hardware",
    why: "A web shop pays the On-Demand price all year for servers that never change. Meanwhile its nightly batch job could have run on spare capacity at a fraction of the price. Each workload must be matched to the way of paying that fits how long, how steadily and how safely it must run.",
    idea: "AWS trades a discount for a commitment or a risk. Savings Plans and Reserved Instances reward a one- or three-year commitment. Spot sells spare capacity that can be taken back. Dedicated options give you hardware of your own.",
    trap: "'Most cost-effective' does not always mean Spot or the longest commitment. Rule out Spot when the work must not be interrupted. Rule out one- or three-year terms when the workload lasts weeks or its future is unknown.",
    q: {
      q: "A conference's ticket shop runs only during its ten-day sale each spring. Losing a server in the middle of the sale would lose orders. Which way of paying for its EC2 capacity costs least?",
      o: [
        "On-Demand Instances",
        "A one-year Compute Savings Plan",
        "Spot Instances",
        "Three-year Standard Reserved Instances"
      ],
      a: [0],
      x: [
        "Right. Short work that must not be interrupted fits On-Demand: no commitment, and no risk of losing the instance.",
        "A one-year commitment keeps costing for the 355 days a year the shop is closed.",
        "Spot capacity can be taken back with a two-minute warning, and losing a server mid-sale loses orders.",
        "A three-year term for ten days a year is the most expensive mismatch of all."
      ],
      dom: 4, tags: ["EC2 purchase options"], doc: "ec2-pricing"
    },
    docs: [
      ["Amazon EC2 billing and purchasing options", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html"],
      ["Savings Plans types", "https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html"],
      ["On-Demand Capacity Reservations", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html"]
    ]
  },

  d1c8: {
    head: "Where your code runs: EC2, Lambda or ECS on Fargate",
    why: "One team keeps a server running all night for an image-resize task that takes seconds. Another squeezes a two-hour job into a function that stops after 15 minutes. How long the work runs, and how much of the machine it needs to control, should decide where it runs.",
    idea: "As on Day 1: EC2 gives you a whole server to control. Lambda runs short functions when events arrive, with no servers to manage. ECS on Fargate runs containers without servers to manage, for as long as they need.",
    trap: "'No servers to manage' does not automatically mean Lambda. A container that runs for hours fits ECS on Fargate. Elastic Beanstalk still provisions EC2 instances or an EKS cluster in your account, so it is not the least-overhead choice for short event-driven work.",
    q: {
      q: "A video-encoding step takes 25 to 50 minutes per file and ships as a Docker image. The team refuses to patch operating systems. Which compute option fits?",
      o: [
        "Amazon ECS tasks on AWS Fargate",
        "A standard AWS Lambda function",
        "EC2 instances in an Auto Scaling group",
        "AWS Elastic Beanstalk with an EC2 environment"
      ],
      a: [0],
      x: [
        "Right. Fargate runs containers without servers to manage, so there is no operating system to patch, and a 50-minute task is no problem.",
        "A standard Lambda function stops after 15 minutes per invocation.",
        "On EC2 you control the operating system, and patching it is your job.",
        "Elastic Beanstalk still provisions EC2 instances in your account for an EC2 environment."
      ],
      dom: 3, tags: ["Containers", "Lambda"], doc: "fargate"
    },
    docs: [
      ["Lambda quotas", "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"],
      ["Architect for AWS Fargate for Amazon ECS", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html"],
      ["What is AWS Elastic Beanstalk?", "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html"]
    ]
  }
});
