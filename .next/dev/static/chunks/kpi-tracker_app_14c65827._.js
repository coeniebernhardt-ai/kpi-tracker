(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/kpi-tracker/app/data/teamData.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    }
];
const teamKPIs = {
    avgTicketsHandled: 83.6,
    avgProjectCompletion: 95.4,
    avgResponseTime: 100,
    projectDeliveryRate: 78,
    avgEngagement: 2.77
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/kpi-tracker/app/admin/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/app/data/teamData.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function getInitials(name) {
    return name.split(' ').map((part)=>part.charAt(0).toUpperCase()).join('');
}
function generateTicketNumber(initials, existingTickets) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayTickets = existingTickets.filter((t)=>t.ticketNumber.includes(dateStr));
    const sequence = String(todayTickets.length + 1).padStart(3, '0');
    return `${initials}-${dateStr}-${sequence}`;
}
function AdminPage() {
    _s();
    const [allMemberTickets, setAllMemberTickets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [showCreateForm, setShowCreateForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedMemberId, setSelectedMemberId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [filterMember, setFilterMember] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [filterStatus, setFilterStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [newTicketData, setNewTicketData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        issue: '',
        location: 'remote'
    });
    // Load all tickets from localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            const loadAllTickets = {
                "AdminPage.useEffect.loadAllTickets": ()=>{
                    const memberTickets = __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["teamMembers"].map({
                        "AdminPage.useEffect.loadAllTickets.memberTickets": (member)=>{
                            const stored = localStorage.getItem(`tickets-${member.id}`);
                            const tickets = stored ? JSON.parse(stored) : [];
                            return {
                                memberId: member.id,
                                memberName: member.name,
                                memberRole: member.role,
                                initials: getInitials(member.name),
                                tickets
                            };
                        }
                    }["AdminPage.useEffect.loadAllTickets.memberTickets"]);
                    setAllMemberTickets(memberTickets);
                }
            }["AdminPage.useEffect.loadAllTickets"];
            loadAllTickets();
            // Refresh every 5 seconds to catch updates from member pages
            const interval = setInterval(loadAllTickets, 5000);
            return ({
                "AdminPage.useEffect": ()=>clearInterval(interval)
            })["AdminPage.useEffect"];
        }
    }["AdminPage.useEffect"], []);
    // Save tickets for a specific member
    const saveTicketsForMember = (memberId, tickets)=>{
        localStorage.setItem(`tickets-${memberId}`, JSON.stringify(tickets));
        setAllMemberTickets((prev)=>prev.map((mt)=>mt.memberId === memberId ? {
                    ...mt,
                    tickets
                } : mt));
    };
    // Create ticket for a member
    const handleCreateTicket = (e)=>{
        e.preventDefault();
        if (!selectedMemberId || !newTicketData.issue.trim()) return;
        const memberData = allMemberTickets.find((mt)=>mt.memberId === selectedMemberId);
        if (!memberData) return;
        const newTicket = {
            id: Date.now().toString(),
            ticketNumber: generateTicketNumber(memberData.initials, memberData.tickets),
            createdAt: new Date().toISOString(),
            status: 'open',
            issue: newTicketData.issue.trim(),
            resolution: '',
            location: newTicketData.location
        };
        saveTicketsForMember(selectedMemberId, [
            newTicket,
            ...memberData.tickets
        ]);
        setNewTicketData({
            issue: '',
            location: 'remote'
        });
        setSelectedMemberId('');
        setShowCreateForm(false);
    };
    // Get all tickets flattened with member info
    const getAllTickets = ()=>{
        return allMemberTickets.flatMap((mt)=>mt.tickets.map((ticket)=>({
                    ...ticket,
                    memberId: mt.memberId,
                    memberName: mt.memberName,
                    memberRole: mt.memberRole,
                    initials: mt.initials
                }))).sort((a, b)=>new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };
    const allTickets = getAllTickets();
    // Apply filters
    const filteredTickets = allTickets.filter((ticket)=>{
        if (filterMember !== 'all' && ticket.memberId !== filterMember) return false;
        if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
        return true;
    });
    // Stats
    const totalOpen = allTickets.filter((t)=>t.status === 'open').length;
    const totalClosed = allTickets.filter((t)=>t.status === 'closed').length;
    const totalOnSite = allTickets.filter((t)=>t.location === 'on-site').length;
    const totalRemote = allTickets.filter((t)=>t.location === 'remote').length;
    const getAvatarGradient = (name)=>{
        const colors = [
            'from-cyan-400 to-blue-500',
            'from-violet-400 to-purple-500',
            'from-rose-400 to-pink-500',
            'from-amber-400 to-orange-500',
            'from-emerald-400 to-teal-500'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-950 bg-grid-pattern bg-radial-gradient",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-40 glass border-b border-slate-700/50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-7xl mx-auto px-6 py-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/",
                                        className: "w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            stroke: "currentColor",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M15 19l-7-7 7-7"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 165,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 164,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 160,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-6 h-6 text-white",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            stroke: "currentColor",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 170,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 171,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 169,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 168,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-xl font-bold text-white",
                                                children: "Admin Dashboard"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 175,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-slate-400",
                                                children: "Ticket Management"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 176,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 174,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 159,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowCreateForm(true),
                                className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg hover:shadow-cyan-500/25 transition-all",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-5 h-5",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M12 4v16m8-8H4"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 185,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 184,
                                        columnNumber: 15
                                    }, this),
                                    "Create Ticket"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 180,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 158,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                    lineNumber: 157,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                lineNumber: 156,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "max-w-7xl mx-auto px-6 py-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mb-8 animate-fade-in",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-slate-500 mb-1",
                                            children: "Total Tickets"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 198,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-3xl font-bold text-white",
                                            children: allTickets.length
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 199,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 197,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-amber-400 mb-1",
                                            children: "Open"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 202,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-3xl font-bold text-amber-400",
                                            children: totalOpen
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 203,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 201,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-emerald-400 mb-1",
                                            children: "Closed"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 206,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-3xl font-bold text-emerald-400",
                                            children: totalClosed
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 207,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 205,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-slate-500 mb-1",
                                            children: "Location Split"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 210,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg font-bold",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-cyan-400",
                                                    children: totalOnSite
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 212,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-600 mx-2",
                                                    children: "On-Site"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 213,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-violet-400",
                                                    children: totalRemote
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 214,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-600 ml-2",
                                                    children: "Remote"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 211,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 209,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                            lineNumber: 196,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 195,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-semibold text-white mb-4",
                                children: "Team Members"
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 223,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 md:grid-cols-5 gap-4",
                                children: allMemberTickets.map((mt)=>{
                                    const openCount = mt.tickets.filter((t)=>t.status === 'open').length;
                                    const closedCount = mt.tickets.filter((t)=>t.status === 'closed').length;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/member/${mt.memberId}`,
                                        className: "p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all group",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 mb-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(mt.memberName)} flex items-center justify-center text-white font-bold text-sm`,
                                                        children: mt.initials
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 235,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex-1 min-w-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors",
                                                                children: mt.memberName.split(' ')[0]
                                                            }, void 0, false, {
                                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500 truncate",
                                                                children: mt.memberRole
                                                            }, void 0, false, {
                                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                lineNumber: 242,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 238,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 234,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-amber-400",
                                                        children: [
                                                            openCount,
                                                            " open"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 246,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-slate-600",
                                                        children: "•"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 247,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-emerald-400",
                                                        children: [
                                                            closedCount,
                                                            " closed"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 248,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 245,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, mt.memberId, true, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 229,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 224,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 222,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-slate-500 mb-1",
                                            children: "Filter by Member"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 260,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filterMember,
                                            onChange: (e)=>setFilterMember(e.target.value),
                                            className: "px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 outline-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "all",
                                                    children: "All Members"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 266,
                                                    columnNumber: 17
                                                }, this),
                                                __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["teamMembers"].map((member)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: member.id,
                                                        children: member.name
                                                    }, member.id, false, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 268,
                                                        columnNumber: 19
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 261,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 259,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-slate-500 mb-1",
                                            children: "Filter by Status"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 273,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filterStatus,
                                            onChange: (e)=>setFilterStatus(e.target.value),
                                            className: "px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 outline-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "all",
                                                    children: "All Status"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "open",
                                                    children: "Open Only"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 280,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "closed",
                                                    children: "Closed Only"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 281,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 274,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 272,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "ml-auto text-sm text-slate-400",
                                    children: [
                                        "Showing ",
                                        filteredTickets.length,
                                        " of ",
                                        allTickets.length,
                                        " tickets"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 284,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                            lineNumber: 258,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 257,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-semibold text-white mb-4",
                                children: "All Tickets"
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 292,
                                columnNumber: 11
                            }, this),
                            filteredTickets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-12 h-12 mx-auto text-slate-600 mb-4",
                                        fill: "none",
                                        viewBox: "0 0 24 24",
                                        stroke: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 1.5,
                                            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        }, void 0, false, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 296,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-slate-500",
                                        children: "No tickets found."
                                    }, void 0, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 299,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 295,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: filteredTickets.map((ticket, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `p-4 rounded-xl border animate-fade-in ${ticket.status === 'open' ? 'bg-slate-800/40 border-amber-500/30' : 'bg-slate-800/30 border-slate-700/50'}`,
                                        style: {
                                            animationDelay: `${index * 30}ms`
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(ticket.memberName)} flex items-center justify-center text-white font-bold text-sm`,
                                                    children: ticket.initials
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 315,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex-1 min-w-0",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center flex-wrap gap-2 mb-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `px-2 py-0.5 rounded text-xs font-bold font-mono ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`,
                                                                    children: ticket.ticketNumber
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 322,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: ticket.memberName
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 327,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `px-2 py-0.5 rounded text-xs ${ticket.location === 'on-site' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'}`,
                                                                    children: ticket.location === 'on-site' ? '📍 On-Site' : '🌐 Remote'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 328,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `px-2 py-0.5 rounded-full text-xs ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`,
                                                                    children: ticket.status === 'open' ? 'Open' : 'Closed'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 335,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 321,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-slate-300 mb-2",
                                                            children: ticket.issue
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 344,
                                                            columnNumber: 23
                                                        }, this),
                                                        ticket.status === 'closed' && ticket.resolution && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-emerald-400 mb-1",
                                                                    children: "Resolution:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 348,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm text-slate-300",
                                                                    children: ticket.resolution
                                                                }, void 0, false, {
                                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                    lineNumber: 349,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 347,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-slate-600 mt-2",
                                                            children: [
                                                                "Created: ",
                                                                new Date(ticket.createdAt).toLocaleDateString('en-ZA', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }),
                                                                ticket.closedAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                    children: [
                                                                        " • Closed: ",
                                                                        new Date(ticket.closedAt).toLocaleDateString('en-ZA', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })
                                                                    ]
                                                                }, void 0, true),
                                                                ticket.responseTimeMinutes !== undefined && ticket.responseTimeMinutes > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                    children: [
                                                                        " • Response: ",
                                                                        ticket.responseTimeMinutes,
                                                                        " min"
                                                                    ]
                                                                }, void 0, true)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 353,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 320,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 313,
                                            columnNumber: 19
                                        }, this)
                                    }, ticket.id, false, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 304,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                lineNumber: 302,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 291,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                lineNumber: 193,
                columnNumber: 7
            }, this),
            showCreateForm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in",
                        onClick: ()=>setShowCreateForm(false)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 378,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex items-center justify-center p-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl animate-fade-in",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-6 border-b border-slate-700/50",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-xl font-bold text-white",
                                                children: "Create Ticket for Team Member"
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 387,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setShowCreateForm(false),
                                                className: "w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    stroke: "currentColor",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M6 18L18 6M6 6l12 12"
                                                    }, void 0, false, {
                                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                        lineNumber: 393,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 392,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                lineNumber: 388,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                        lineNumber: 386,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 385,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                    onSubmit: handleCreateTicket,
                                    className: "p-6 space-y-5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-2",
                                                    children: [
                                                        "Assign to Team Member ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-rose-400",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 403,
                                                            columnNumber: 43
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 402,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: selectedMemberId,
                                                    onChange: (e)=>setSelectedMemberId(e.target.value),
                                                    required: true,
                                                    className: "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 outline-none",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "Select a team member..."
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 411,
                                                            columnNumber: 21
                                                        }, this),
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["teamMembers"].map((member)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: member.id,
                                                                children: [
                                                                    member.name,
                                                                    " (",
                                                                    member.role,
                                                                    ")"
                                                                ]
                                                            }, member.id, true, {
                                                                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                                lineNumber: 413,
                                                                columnNumber: 23
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 405,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 401,
                                            columnNumber: 17
                                        }, this),
                                        selectedMemberId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-3 rounded-xl bg-slate-800/50 border border-slate-700/30",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-slate-500 mb-1",
                                                    children: "Ticket Number (auto-generated)"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 423,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm font-mono text-cyan-400",
                                                    children: generateTicketNumber(getInitials(__TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$data$2f$teamData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["teamMembers"].find((m)=>m.id === selectedMemberId)?.name || ''), allMemberTickets.find((mt)=>mt.memberId === selectedMemberId)?.tickets || [])
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 422,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-2",
                                                    children: "Date"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 435,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400",
                                                    children: new Date().toLocaleDateString('en-ZA', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 436,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 434,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-2",
                                                    children: "Task Location"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 443,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setNewTicketData({
                                                                    ...newTicketData,
                                                                    location: 'on-site'
                                                                }),
                                                            className: `flex-1 px-4 py-3 rounded-xl border transition-all ${newTicketData.location === 'on-site' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`,
                                                            children: "📍 On-Site"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 445,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setNewTicketData({
                                                                    ...newTicketData,
                                                                    location: 'remote'
                                                                }),
                                                            className: `flex-1 px-4 py-3 rounded-xl border transition-all ${newTicketData.location === 'remote' ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`,
                                                            children: "🌐 Remote"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 456,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 444,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 442,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-slate-300 mb-2",
                                                    children: [
                                                        "Issue Description ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-rose-400",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                            lineNumber: 473,
                                                            columnNumber: 39
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 472,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                    value: newTicketData.issue,
                                                    onChange: (e)=>setNewTicketData({
                                                            ...newTicketData,
                                                            issue: e.target.value
                                                        }),
                                                    rows: 4,
                                                    required: true,
                                                    className: "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors resize-none",
                                                    placeholder: "Describe the issue or task..."
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 475,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 471,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex gap-3 pt-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "submit",
                                                    disabled: !selectedMemberId || !newTicketData.issue.trim(),
                                                    className: "flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                    children: "Create Ticket"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 486,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>setShowCreateForm(false),
                                                    className: "px-5 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors",
                                                    children: "Cancel"
                                                }, void 0, false, {
                                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                                    lineNumber: 493,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                            lineNumber: 485,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                                    lineNumber: 399,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                            lineNumber: 384,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                        lineNumber: 383,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/kpi-tracker/app/admin/page.tsx",
                lineNumber: 377,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/kpi-tracker/app/admin/page.tsx",
        lineNumber: 154,
        columnNumber: 5
    }, this);
}
_s(AdminPage, "ArqOerIc8PyN5cb6xUy0mCuMz8o=");
_c = AdminPage;
var _c;
__turbopack_context__.k.register(_c, "AdminPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=kpi-tracker_app_14c65827._.js.map