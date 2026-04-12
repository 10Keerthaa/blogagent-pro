export interface Category {
    id: number;
    name: string;
}

export const CATEGORIES: Category[] = [
    { id: 253, name: "Blog" }, // Locked
    { id: 230, name: "AAA" },
    { id: 222, name: "AI" },
    { id: 516, name: "Chatbot" },
    { id: 223, name: "Analytics" },
    { id: 224, name: "Automation" },
    { id: 251, name: "Cybersecurity" },
    { id: 505, name: "Developer Series" },
    { id: 238, name: "Insights" },
    { id: 615, name: "Process Discovery" },
    { id: 241, name: "Thought Leadership" },
    { id: 500, name: "Digital" },
    { id: 501, name: "Digital Marketing" },
    { id: 690, name: "ESG" },
    { id: 601, name: "Finance and Accounting" },
    { id: 319, name: "Human Resources" },
    { id: 603, name: "Supply Chain" },
    { id: 257, name: "Banking" },
    { id: 535, name: "F&B" },
    { id: 326, name: "Healthcare" },
    { id: 590, name: "Hospitality" },
    { id: 272, name: "Insurance" },
    { id: 527, name: "Logistics" },
    { id: 537, name: "Manufacturing" },
    { id: 531, name: "Oil & Gas" },
    { id: 529, name: "Retail" },
    { id: 256, name: "Telecom" },
    { id: 605, name: "Microsoft" },
    { id: 669, name: "Microsoft Azure" },
    { id: 493, name: "WAM" },
    { id: 514, name: "App" },
    { id: 549, name: "Ecommerce" },
    { id: 494, name: "Web" }
];

export const LOCKED_CATEGORY_ID = 253; // Blog
