module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/kpi-tracker/app/data/teamData.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "teamKPIs",
    ()=>teamKPIs,
    "teamMembers",
    ()=>teamMembers
]);
const teamMembers = [
    {
        id: 'andreas',
        name: 'Andreas Groenewald',
        role: 'Support Technician',
        avatar: 'AG',
        definition: 'The Support Technician provides hands-on technical assistance and maintenance for digital access control systems. This role focuses on diagnosing and resolving hardware and software issues, supporting installations, and ensuring optimal system performance for clients and internal users. The Support Technician plays a key role in delivering reliable and responsive technical support. They provide frontline technical and administrative support for digital access control systems. This role ensures smooth operation of customer-facing platforms, assists with troubleshooting, and supports the technical team in delivering high-quality service and solutions. Success in this role requires a combination of technical proficiency, effective communication, and strong organizational skills.',
        responsibilities: [
            'Customer Support: Respond to technical queries from clients and users, providing guidance and resolving issues related to digital access platforms.',
            'System Monitoring: Assist in monitoring system performance, logging incidents, and escalating issues to the appropriate technical teams.',
            'Documentation & Reporting: Maintain accurate records of support requests, resolutions, and system updates; assist in preparing reports and user guides.',
            'Technical Assistance: Support the setup, configuration, and testing of access control devices and software.',
            'Training & Onboarding: Help new users onboard by providing basic training and support materials for digital access systems.',
            'Collaboration: Work closely with the Technical Solutions team to ensure timely and effective resolution of customer issues.',
            'Process Improvement: Identify recurring issues and suggest improvements to support processes and user experience.'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 85,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 92,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 2.7,
                targetValue: 3
            }
        ]
    },
    {
        id: 'cornett',
        name: 'Cornett van Niekerk',
        role: 'Support Consultant',
        avatar: 'CN',
        definition: 'The Support Consultant provides expert-level assistance and guidance to clients and internal teams regarding digital access control systems. This role focuses on resolving technical issues, optimizing system performance, and ensuring customer satisfaction through proactive support and tailored solutions. The Support Consultant acts as a trusted advisor, combining technical knowledge with strong communication and problem-solving skills.',
        responsibilities: [
            'Technical Support: Recognising and reporting issues with troubleshooting for software related to access control systems.',
            'Client Advisory: Offer consultative support to clients, helping them understand system capabilities and recommending best practices for implementation and usage.',
            'Documentation & Training: Create and maintain support documentation, user guides, and training materials; deliver training sessions to clients and internal teams.',
            'Issue Escalation: Collaborate with development and technical teams to escalate and resolve complex technical problems.',
            'Feedback & Improvement: Gather client feedback and contribute to product and service improvements based on recurring support themes.'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 88,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 97,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 2.8,
                targetValue: 3
            }
        ]
    },
    {
        id: 'lisandro',
        name: 'Lisandro Davis',
        role: 'Digital Project Manager',
        avatar: 'LD',
        definition: 'The Digital Project Manager provides hands-on technical assistance and maintenance for digital access control systems. This role focuses on diagnosing and resolving hardware and software issues, supporting installations, and ensuring optimal system performance for clients and internal users. The Digital Project Manager plays a key role in delivering reliable and responsive technical support. They provide frontline technical and administrative support for digital access control systems. This role ensures smooth operation of customer-facing platforms, assists with troubleshooting, and supports the technical team in delivering high-quality service and solutions. Success in this role requires a combination of technical proficiency, effective communication, and strong organizational skills.',
        responsibilities: [
            'Customer Support: Respond to technical queries from clients and users, providing guidance and resolving issues related to digital access platforms.',
            'System Monitoring: Assist in monitoring system performance, logging incidents, and escalating issues to the appropriate technical teams.',
            'Documentation & Reporting: Maintain accurate records of support requests, resolutions, and system updates; assist in preparing reports and user guides.',
            'Technical Assistance: Support the setup, configuration, and testing of access control devices and software.',
            'Training & Onboarding: Help new users onboard by providing basic training and support materials for digital access systems.',
            'Collaboration: Work closely with the Technical Solutions team to ensure timely and effective resolution of customer issues.',
            'Process Improvement: Identify recurring issues and suggest improvements to support processes and user experience.'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 82,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed on Time / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 96,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 2.9,
                targetValue: 3
            }
        ]
    },
    {
        id: 'lucas',
        name: 'Lucas Bron',
        role: 'Digital Support Assistant',
        avatar: 'LB',
        definition: 'The Digital Support Assistant provides hands-on technical assistance and maintenance for digital access control systems. This role focuses on diagnosing and resolving hardware and software issues, supporting installations, and ensuring optimal system performance for clients and internal users. The Support Assistant plays a key role in delivering reliable and responsive technical support. They provide frontline technical and administrative support for digital access control systems. This role ensures smooth operation of customer-facing platforms, assists with troubleshooting, and supports the technical team in delivering high-quality service and solutions. Success in this role requires a combination of technical proficiency, effective communication, and strong organizational skills.',
        responsibilities: [
            'Customer Support: Respond to technical queries from clients and users, providing guidance and resolving issues related to digital access platforms.',
            'System Monitoring: Assist in monitoring system performance, logging incidents, and escalating issues to the appropriate technical teams.',
            'Documentation & Reporting: Maintain accurate records of support requests, resolutions, and system updates; assist in preparing reports and user guides.',
            'Technical Assistance: Support the setup, configuration, and testing of access control devices and software.',
            'Training & Onboarding: Help new users onboard by providing basic training and support materials for digital access systems.',
            'Collaboration: Work closely with the Technical Solutions team to ensure timely and effective resolution of customer issues.',
            'Process Improvement: Identify recurring issues and suggest improvements to support processes and user experience.'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 79,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 94,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 2.6,
                targetValue: 3
            }
        ]
    },
    {
        id: 'marcellus',
        name: 'Marcellus Hoods',
        role: 'Digital Support Technician',
        avatar: 'MH',
        definition: 'The Digital Support Technician provides hands-on technical assistance and maintenance for digital access control systems. This role focuses on diagnosing and resolving hardware and software issues, supporting installations, and ensuring optimal system performance for clients and internal users. The Support Technician plays a key role in delivering reliable and responsive technical support. They provide frontline technical and administrative support for digital access control systems. This role ensures smooth operation of customer-facing platforms, assists with troubleshooting, and supports the technical team in delivering high-quality service and solutions. Success in this role requires a combination of technical proficiency, effective communication, and strong organizational skills.',
        responsibilities: [
            'Customer Support: Respond to technical queries from clients and users, providing guidance and resolving issues related to digital access platforms.',
            'System Monitoring: Assist in monitoring system performance, logging incidents, and escalating issues to the appropriate technical teams.',
            'Documentation & Reporting: Maintain accurate records of support requests, resolutions, and system updates; assist in preparing reports and user guides.',
            'Technical Assistance: Support the setup, configuration, and testing of access control devices and software.',
            'Training & Onboarding: Help new users onboard by providing basic training and support materials for digital access systems.',
            'Collaboration: Work closely with the Technical Solutions team to ensure timely and effective resolution of customer issues.',
            'Process Improvement: Identify recurring issues and suggest improvements to support processes and user experience.'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 84,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 98,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 2.85,
                targetValue: 3
            }
        ]
    },
    {
        id: 'coenie-test',
        name: 'Coenie Test',
        role: 'Test Account',
        avatar: 'CT',
        definition: 'This is a test account for system testing and demonstration purposes. Use this account to explore the ticket system functionality without affecting real team member data.',
        responsibilities: [
            'Test new ticket creation flow',
            'Test ticket resolution workflow',
            'Verify KPI calculations',
            'Demo system to stakeholders',
            'Quality assurance testing'
        ],
        kpis: [
            {
                id: 'tickets-handled',
                name: 'Number of Tickets Handled',
                type: 'individual',
                goal: 'Total number of tickets resolved by the technician. Based on percentage',
                target: '80% excluding dependencies',
                measurement: '(Tickets closed by Technician / Total tickets appointed to Technician) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 0,
                targetValue: 80
            },
            {
                id: 'project-completion',
                name: 'On-Time Project/Task Completion Rate',
                type: 'individual',
                goal: 'Percentage of assigned project tasks completed by the agreed deadline.',
                target: '≥ 95%',
                measurement: '(Total Projects Completed / Total Projects) × 100',
                tracking: 'Projects Tracked via ClickUp',
                currentValue: 0,
                targetValue: 95
            },
            {
                id: 'response-time',
                name: 'Average First Response Time',
                type: 'team',
                goal: 'Ensures timely acknowledgment of support tickets and builds customer trust',
                target: '≤ 1 hour during business hours = 100%',
                measurement: '(First Response Time for all emergency tickets / Total number of emergency tickets) × 100',
                tracking: 'Google Sheets Ticket Management System',
                currentValue: 100,
                targetValue: 100
            },
            {
                id: 'project-delivery',
                name: 'On-Time Project Delivery Rate',
                type: 'team',
                goal: 'Percentage of technical support-related projects (e.g., system configurations, installations, integrations) delivered on or before the agreed deadline.',
                target: '≥ 70% on-time delivery',
                measurement: '(Projects delivered on time / Total projects) × 100',
                tracking: 'ClickUp Management System',
                currentValue: 78,
                targetValue: 70
            },
            {
                id: 'engagement',
                name: 'Group Impact and Engagement',
                type: 'group',
                goal: 'To foster a professional, respectful, and collaborative work environment through consistent demonstration of positive workplace behavior and interpersonal conduct',
                target: 'Discretion of Solutions Manager & Executive Management Team',
                measurement: 'Bamboo Total Scores / (Total survey × 3)',
                tracking: 'Peer and management surveys rate 1-3 (Never, Sometimes, Most of the time)',
                currentValue: 3,
                targetValue: 3
            }
        ]
    }
];
const teamKPIs = {
    avgTicketsHandled: 83.6,
    avgProjectCompletion: 95.4,
    avgResponseTime: 100,
    projectDeliveryRate: 78,
    avgEngagement: 2.77
};
}),
"[project]/kpi-tracker/app/data/authData.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Default passwords for each team member (can be changed by admin)
__turbopack_context__.s([
    "defaultPasswords",
    ()=>defaultPasswords,
    "getAllPasswords",
    ()=>getAllPasswords,
    "getPassword",
    ()=>getPassword,
    "isLoggedIn",
    ()=>isLoggedIn,
    "login",
    ()=>login,
    "logout",
    ()=>logout,
    "setPassword",
    ()=>setPassword,
    "verifyPassword",
    ()=>verifyPassword
]);
const defaultPasswords = {
    andreas: 'AG2024!',
    cornett: 'CN2024!',
    lisandro: 'LD2024!',
    lucas: 'LB2024!',
    marcellus: 'MH2024!',
    'coenie-test': 'CT2024!'
};
function getPassword(memberId) {
    if ("TURBOPACK compile-time truthy", 1) return '';
    //TURBOPACK unreachable
    ;
    const stored = undefined;
}
function setPassword(memberId, password) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
function getAllPasswords() {
    if ("TURBOPACK compile-time truthy", 1) return defaultPasswords;
    //TURBOPACK unreachable
    ;
    const passwords = undefined;
}
function verifyPassword(memberId, inputPassword) {
    const correctPassword = getPassword(memberId);
    return inputPassword === correctPassword;
}
function isLoggedIn(memberId) {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    const session = undefined;
}
function login(memberId) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
function logout(memberId) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
}),
"[project]/kpi-tracker/app/member/[id]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MemberPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/app/data/teamData.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$authData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/app/data/authData.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
// Generate initials from name
function getInitials(name) {
    return name.split(' ').map((part)=>part.charAt(0).toUpperCase()).join('');
}
// Generate unique ticket number
function generateTicketNumber(initials, existingTickets) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    // Count tickets created today by this member
    const todayTickets = existingTickets.filter((t)=>t.ticketNumber.includes(dateStr));
    const sequence = String(todayTickets.length + 1).padStart(3, '0');
    return `${initials}-${dateStr}-${sequence}`;
}
// Login Component
function LoginForm({ memberId, memberName, onLogin }) {
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [showPassword, setShowPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleSubmit = (e)=>{
        e.preventDefault();
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$authData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["verifyPassword"])(memberId, password)) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$authData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["login"])(memberId);
            onLogin();
        } else {
            setError('Incorrect password. Please try again.');
            setPassword('');
        }
    };
    const getAvatarGradient = ()=>{
        const colors = [
            'from-cyan-400 to-blue-500',
            'from-violet-400 to-purple-500',
            'from-rose-400 to-pink-500',
            'from-amber-400 to-orange-500',
            'from-emerald-400 to-teal-500'
        ];
        const index = memberName.charCodeAt(0) % colors.length;
        return colors[index];
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient flex items-center justify-center p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-md",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4`,
                            children: getInitials(memberName)
                        }, void 0, false, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-white mb-2",
                            children: [
                                "Welcome, ",
                                memberName.split(' ')[0]
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 80,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-slate-400",
                            children: "Please enter your password to access your ticket page"
                        }, void 0, false, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 81,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                    lineNumber: 76,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-slate-300 mb-2",
                                    children: "Password"
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: showPassword ? 'text' : 'password',
                                            value: password,
                                            onChange: (e)=>{
                                                setPassword(e.target.value);
                                                setError('');
                                            },
                                            className: "w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors pr-12",
                                            placeholder: "Enter your password",
                                            autoFocus: true
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 88,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setShowPassword(!showPassword),
                                            className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors",
                                            children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-5 h-5",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                stroke: "currentColor",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 106,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-5 h-5",
                                                fill: "none",
                                                viewBox: "0 0 24 24",
                                                stroke: "currentColor",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 110,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 111,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 109,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 99,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 87,
                                    columnNumber: 13
                                }, this),
                                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 text-sm text-rose-400 flex items-center gap-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-4 h-4",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            stroke: "currentColor",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 119,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 118,
                                            columnNumber: 17
                                        }, this),
                                        error
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 117,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 85,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            className: "w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg hover:shadow-cyan-500/25 transition-all",
                            children: "Sign In"
                        }, void 0, false, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 126,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-4 text-center text-xs text-slate-500",
                            children: "Forgot your password? Contact your administrator."
                        }, void 0, false, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 133,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                    lineNumber: 84,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6 text-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "text-sm text-slate-400 hover:text-cyan-400 transition-colors",
                        children: "← Back to Dashboard"
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 139,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                    lineNumber: 138,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
            lineNumber: 75,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, this);
}
function MemberPage() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const memberId = params.id;
    const member = __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["teamMembers"].find((m)=>m.id === memberId);
    const [isAuthenticated, setIsAuthenticated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [checkingAuth, setCheckingAuth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [tickets, setTickets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [showNewTicketForm, setShowNewTicketForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('open');
    const [closingTicketId, setClosingTicketId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // New ticket form
    const [newTicketData, setNewTicketData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        issue: '',
        location: 'remote'
    });
    // Close ticket form
    const [closeTicketData, setCloseTicketData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        resolution: '',
        responseTimeMinutes: 0
    });
    const memberInitials = member ? getInitials(member.name) : 'XX';
    // Check authentication on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setIsAuthenticated((0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$authData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLoggedIn"])(memberId));
        setCheckingAuth(false);
    }, [
        memberId
    ]);
    // Load tickets from localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isAuthenticated) return;
        const stored = localStorage.getItem(`tickets-${memberId}`);
        if (stored) {
            setTickets(JSON.parse(stored));
        }
    }, [
        memberId,
        isAuthenticated
    ]);
    // Save tickets to localStorage
    const saveTickets = (newTickets)=>{
        localStorage.setItem(`tickets-${memberId}`, JSON.stringify(newTickets));
        setTickets(newTickets);
    };
    // Create new ticket
    const handleCreateTicket = (e)=>{
        e.preventDefault();
        if (!newTicketData.issue.trim()) return;
        const newTicket = {
            id: Date.now().toString(),
            ticketNumber: generateTicketNumber(memberInitials, tickets),
            createdAt: new Date().toISOString(),
            status: 'open',
            issue: newTicketData.issue.trim(),
            resolution: '',
            location: newTicketData.location
        };
        saveTickets([
            newTicket,
            ...tickets
        ]);
        setNewTicketData({
            issue: '',
            location: 'remote'
        });
        setShowNewTicketForm(false);
    };
    // Close a ticket
    const handleCloseTicket = (ticketId)=>{
        if (!closeTicketData.resolution.trim()) return;
        const updatedTickets = tickets.map((ticket)=>{
            if (ticket.id === ticketId) {
                return {
                    ...ticket,
                    status: 'closed',
                    resolution: closeTicketData.resolution.trim(),
                    responseTimeMinutes: closeTicketData.responseTimeMinutes,
                    closedAt: new Date().toISOString()
                };
            }
            return ticket;
        });
        saveTickets(updatedTickets);
        setClosingTicketId(null);
        setCloseTicketData({
            resolution: '',
            responseTimeMinutes: 0
        });
    };
    // Handle logout
    const handleLogout = ()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$authData$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logout"])(memberId);
        setIsAuthenticated(false);
    };
    // Calculate KPIs
    const calculateKPIs = ()=>{
        const closedTickets = tickets.filter((t)=>t.status === 'closed');
        const totalTickets = tickets.length;
        if (totalTickets === 0) return null;
        const ticketsHandled = (closedTickets.length / totalTickets * 100).toFixed(1);
        const ticketsWithResponse = closedTickets.filter((t)=>t.responseTimeMinutes !== undefined && t.responseTimeMinutes > 0);
        const avgResponseTime = ticketsWithResponse.length > 0 ? (ticketsWithResponse.reduce((sum, t)=>sum + (t.responseTimeMinutes || 0), 0) / ticketsWithResponse.length).toFixed(0) : '0';
        const onSiteTickets = tickets.filter((t)=>t.location === 'on-site').length;
        const remoteTickets = tickets.filter((t)=>t.location === 'remote').length;
        return {
            ticketsHandled,
            avgResponseTime,
            openTickets: tickets.filter((t)=>t.status === 'open').length,
            closedTickets: closedTickets.length,
            totalTickets,
            onSiteTickets,
            remoteTickets
        };
    };
    const kpis = calculateKPIs();
    const openTickets = tickets.filter((t)=>t.status === 'open');
    const closedTickets = tickets.filter((t)=>t.status === 'closed');
    const getAvatarGradient = ()=>{
        const colors = [
            'from-cyan-400 to-blue-500',
            'from-violet-400 to-purple-500',
            'from-rose-400 to-pink-500',
            'from-amber-400 to-orange-500',
            'from-emerald-400 to-teal-500'
        ];
        const index = member?.name.charCodeAt(0) ?? 0;
        return colors[index % colors.length];
    };
    // Show loading while checking auth
    if (checkingAuth) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-slate-950 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"
            }, void 0, false, {
                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                lineNumber: 291,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
            lineNumber: 290,
            columnNumber: 7
        }, this);
    }
    // Member not found
    if (!member) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-slate-950 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-white mb-4",
                        children: "Team Member Not Found"
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 301,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "text-cyan-400 hover:text-cyan-300",
                        children: "← Back to Dashboard"
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 302,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                lineNumber: 300,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
            lineNumber: 299,
            columnNumber: 7
        }, this);
    }
    // Show login form if not authenticated
    if (!isAuthenticated) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LoginForm, {
            memberId: memberId,
            memberName: member.name,
            onLogin: ()=>setIsAuthenticated(true)
        }, void 0, false, {
            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
            lineNumber: 313,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-40 glass border-b border-slate-700/50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-4xl mx-auto px-6 py-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    className: "w-5 h-5",
                                    fill: "none",
                                    viewBox: "0 0 24 24",
                                    stroke: "currentColor",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2,
                                        d: "M15 19l-7-7 7-7"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 332,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 331,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 327,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold shadow-lg`,
                                children: member.avatar
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 335,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-xl font-bold text-white",
                                        children: member.name
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 339,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-slate-400",
                                        children: member.role
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 340,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 338,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-right mr-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-slate-500",
                                        children: "Your ID"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 343,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg font-mono font-bold text-cyan-400",
                                        children: memberInitials
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 344,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 342,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleLogout,
                                className: "px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-4 h-4",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 351,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 350,
                                        columnNumber: 15
                                    }, this),
                                    "Sign Out"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 346,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 326,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                    lineNumber: 325,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                lineNumber: 324,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "max-w-4xl mx-auto px-6 py-8",
                children: [
                    kpis && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mb-8 animate-fade-in",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-semibold text-white mb-4 flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-5 h-5 text-emerald-400",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 365,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 364,
                                        columnNumber: 15
                                    }, this),
                                    "Your Performance Summary"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 363,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 rounded-xl bg-slate-800/50 border border-slate-700/50",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500 mb-1",
                                                children: "Tickets Handled"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 371,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: `text-2xl font-bold ${parseFloat(kpis.ticketsHandled) >= 80 ? 'text-emerald-400' : 'text-amber-400'}`,
                                                children: [
                                                    kpis.ticketsHandled,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 372,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-600 mt-1",
                                                children: "Target: 80%"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 375,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 370,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 rounded-xl bg-slate-800/50 border border-slate-700/50",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500 mb-1",
                                                children: "Avg Response Time"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 378,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: `text-2xl font-bold ${parseFloat(kpis.avgResponseTime) <= 60 ? 'text-emerald-400' : 'text-amber-400'}`,
                                                children: [
                                                    kpis.avgResponseTime,
                                                    " min"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 379,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-600 mt-1",
                                                children: "Target: ≤60 min"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 382,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 377,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 rounded-xl bg-slate-800/50 border border-slate-700/50",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500 mb-1",
                                                children: "Open / Closed"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 385,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-2xl font-bold text-white",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-amber-400",
                                                        children: kpis.openTickets
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 387,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-slate-600 mx-1",
                                                        children: "/"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 388,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-emerald-400",
                                                        children: kpis.closedTickets
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 389,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 386,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-600 mt-1",
                                                children: [
                                                    "Total: ",
                                                    kpis.totalTickets
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 391,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 384,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 rounded-xl bg-slate-800/50 border border-slate-700/50",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500 mb-1",
                                                children: "Location Split"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 394,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-cyan-400",
                                                        children: [
                                                            kpis.onSiteTickets,
                                                            " On-site"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 396,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-slate-600",
                                                        children: "|"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 397,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-violet-400",
                                                        children: [
                                                            kpis.remoteTickets,
                                                            " Remote"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 398,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 395,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 393,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 369,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 362,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setShowNewTicketForm(!showNewTicketForm),
                            className: "flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    className: "w-5 h-5",
                                    fill: "none",
                                    viewBox: "0 0 24 24",
                                    stroke: "currentColor",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2,
                                        d: "M12 4v16m8-8H4"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 412,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 411,
                                    columnNumber: 13
                                }, this),
                                showNewTicketForm ? 'Cancel' : 'Open New Ticket'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 407,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 406,
                        columnNumber: 9
                    }, this),
                    showNewTicketForm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: handleCreateTicket,
                        className: "mb-8 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 animate-fade-in",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-semibold text-white",
                                        children: "Open New Ticket"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 422,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-right",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500",
                                                children: "Ticket Number (auto-generated)"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 424,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-mono text-cyan-400",
                                                children: generateTicketNumber(memberInitials, tickets)
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 425,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 423,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 421,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-slate-300 mb-2",
                                                children: "Date"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 432,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-slate-400",
                                                children: new Date().toLocaleDateString('en-ZA', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 433,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 431,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-slate-300 mb-2",
                                                children: "Task Location"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 440,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setNewTicketData({
                                                                ...newTicketData,
                                                                location: 'on-site'
                                                            }),
                                                        className: `flex-1 px-4 py-3 rounded-xl border transition-all ${newTicketData.location === 'on-site' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-center gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                    className: "w-5 h-5",
                                                                    fill: "none",
                                                                    viewBox: "0 0 24 24",
                                                                    stroke: "currentColor",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                        strokeLinecap: "round",
                                                                        strokeLinejoin: "round",
                                                                        strokeWidth: 2,
                                                                        d: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                        lineNumber: 453,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 452,
                                                                    columnNumber: 23
                                                                }, this),
                                                                "On-Site"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 451,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 442,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setNewTicketData({
                                                                ...newTicketData,
                                                                location: 'remote'
                                                            }),
                                                        className: `flex-1 px-4 py-3 rounded-xl border transition-all ${newTicketData.location === 'remote' ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-center gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                    className: "w-5 h-5",
                                                                    fill: "none",
                                                                    viewBox: "0 0 24 24",
                                                                    stroke: "currentColor",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                        strokeLinecap: "round",
                                                                        strokeLinejoin: "round",
                                                                        strokeWidth: 2,
                                                                        d: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                        lineNumber: 469,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 468,
                                                                    columnNumber: 23
                                                                }, this),
                                                                "Remote"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 467,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 458,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 441,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 439,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-slate-300 mb-2",
                                                children: [
                                                    "Issue Description ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-rose-400",
                                                        children: "*"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                        lineNumber: 480,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 479,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                value: newTicketData.issue,
                                                onChange: (e)=>setNewTicketData({
                                                        ...newTicketData,
                                                        issue: e.target.value
                                                    }),
                                                rows: 4,
                                                required: true,
                                                className: "w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors resize-none",
                                                placeholder: "Describe the issue or task in detail..."
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 482,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 478,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 429,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-6 flex gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "submit",
                                        disabled: !newTicketData.issue.trim(),
                                        className: "flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                        children: "Open Ticket"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 494,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setShowNewTicketForm(false),
                                        className: "px-5 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors",
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                        lineNumber: 501,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                lineNumber: 493,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 420,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setActiveTab('open'),
                                    className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'open' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`,
                                    children: [
                                        "Open Tickets (",
                                        openTickets.length,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 515,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setActiveTab('closed'),
                                    className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'closed' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-300'}`,
                                    children: [
                                        "Closed Tickets (",
                                        closedTickets.length,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 525,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                            lineNumber: 514,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 513,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        children: [
                            activeTab === 'open' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: openTickets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-12 h-12 mx-auto text-slate-600 mb-4",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            stroke: "currentColor",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 1.5,
                                                d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 545,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 544,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-500",
                                            children: "No open tickets. Great job!"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 547,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 543,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: openTickets.map((ticket, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-5 rounded-2xl bg-slate-800/40 border border-amber-500/30 animate-fade-in",
                                            style: {
                                                animationDelay: `${index * 50}ms`
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start justify-between mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-3 mb-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold font-mono",
                                                                            children: ticket.ticketNumber
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 560,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: `px-2.5 py-1 rounded-lg text-xs font-medium ${ticket.location === 'on-site' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'}`,
                                                                            children: ticket.location === 'on-site' ? '📍 On-Site' : '🌐 Remote'
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 563,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 559,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: [
                                                                        "Opened: ",
                                                                        new Date(ticket.createdAt).toLocaleDateString('en-ZA', {
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 571,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 558,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium",
                                                            children: "Open"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 582,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 557,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-slate-500 mb-1",
                                                            children: "Issue"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 588,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-slate-200 leading-relaxed",
                                                            children: ticket.issue
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 589,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 587,
                                                    columnNumber: 23
                                                }, this),
                                                closingTicketId === ticket.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 animate-fade-in",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                            className: "text-sm font-semibold text-emerald-400 mb-4",
                                                            children: "Close Ticket"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 594,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                            className: "block text-sm text-slate-400 mb-2",
                                                                            children: [
                                                                                "Resolution ",
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "text-rose-400",
                                                                                    children: "*"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                                    lineNumber: 598,
                                                                                    columnNumber: 44
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 597,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                                            value: closeTicketData.resolution,
                                                                            onChange: (e)=>setCloseTicketData({
                                                                                    ...closeTicketData,
                                                                                    resolution: e.target.value
                                                                                }),
                                                                            rows: 3,
                                                                            className: "w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors resize-none",
                                                                            placeholder: "Describe how the issue was resolved..."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 600,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 596,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                            className: "block text-sm text-slate-400 mb-2",
                                                                            children: "Response Time (minutes)"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 609,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                            type: "number",
                                                                            min: "0",
                                                                            value: closeTicketData.responseTimeMinutes,
                                                                            onChange: (e)=>setCloseTicketData({
                                                                                    ...closeTicketData,
                                                                                    responseTimeMinutes: parseInt(e.target.value) || 0
                                                                                }),
                                                                            className: "w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors",
                                                                            placeholder: "Time from first response to resolution"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 612,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 608,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex gap-3",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>handleCloseTicket(ticket.id),
                                                                            disabled: !closeTicketData.resolution.trim(),
                                                                            className: "flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                                            children: "Close Ticket"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 622,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>{
                                                                                setClosingTicketId(null);
                                                                                setCloseTicketData({
                                                                                    resolution: '',
                                                                                    responseTimeMinutes: 0
                                                                                });
                                                                            },
                                                                            className: "px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors",
                                                                            children: "Cancel"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 629,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 621,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 595,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 593,
                                                    columnNumber: 25
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setClosingTicketId(ticket.id),
                                                    className: "w-full px-4 py-2 rounded-xl border border-emerald-500/50 text-emerald-400 font-medium hover:bg-emerald-500/10 transition-colors",
                                                    children: "Resolve & Close Ticket"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 642,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, ticket.id, true, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 552,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 550,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false),
                            activeTab === 'closed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: closedTickets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-12 h-12 mx-auto text-slate-600 mb-4",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            stroke: "currentColor",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 1.5,
                                                d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                lineNumber: 661,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 660,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-500",
                                            children: "No closed tickets yet."
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 663,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 659,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: closedTickets.map((ticket, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 animate-fade-in",
                                            style: {
                                                animationDelay: `${index * 50}ms`
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start justify-between mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-3 mb-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold font-mono",
                                                                            children: ticket.ticketNumber
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 676,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: `px-2.5 py-1 rounded-lg text-xs font-medium ${ticket.location === 'on-site' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'}`,
                                                                            children: ticket.location === 'on-site' ? '📍 On-Site' : '🌐 Remote'
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 679,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        ticket.responseTimeMinutes !== undefined && ticket.responseTimeMinutes > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: `px-2.5 py-1 rounded-lg text-xs font-medium ${ticket.responseTimeMinutes <= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`,
                                                                            children: [
                                                                                "⏱ ",
                                                                                ticket.responseTimeMinutes,
                                                                                " min"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                            lineNumber: 687,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 675,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: [
                                                                        "Opened: ",
                                                                        new Date(ticket.createdAt).toLocaleDateString('en-ZA', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        }),
                                                                        ticket.closedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                            children: [
                                                                                " • Closed: ",
                                                                                new Date(ticket.closedAt).toLocaleDateString('en-ZA', {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })
                                                                            ]
                                                                        }, void 0, true)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 696,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 674,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium",
                                                            children: "Closed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 713,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 673,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3 rounded-xl bg-slate-900/50",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500 mb-1",
                                                                    children: "Issue"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 720,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm text-slate-300 leading-relaxed",
                                                                    children: ticket.issue
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 721,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 719,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-emerald-400 mb-1",
                                                                    children: "Resolution"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 724,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm text-slate-300 leading-relaxed",
                                                                    children: ticket.resolution
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                                    lineNumber: 725,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                            lineNumber: 723,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                                    lineNumber: 718,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, ticket.id, true, {
                                            fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                            lineNumber: 668,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                                    lineNumber: 666,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                        lineNumber: 539,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
                lineNumber: 359,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/kpi-tracker/app/member/[id]/page.tsx",
        lineNumber: 322,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f0199d36._.js.map