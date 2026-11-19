'use strict';

const departments = [
  {
    name: 'Executive Management',
    description: 'Company leadership, strategic planning and business management.',
    status: 1,
  },
  {
    name: 'Software Development',
    description: 'Software application development and engineering.',
    status: 1,
  },
  {
    name: 'Frontend Development',
    description: 'Development of web application user interfaces.',
    status: 1,
  },
  {
    name: 'Backend Development',
    description: 'Server-side development, APIs and business logic.',
    status: 1,
  },
  {
    name: 'Full Stack Development',
    description: 'End-to-end frontend and backend application development.',
    status: 1,
  },
  {
    name: 'Mobile App Development',
    description: 'Android, iOS and cross-platform mobile application development.',
    status: 1,
  },
  {
    name: 'UI/UX Design',
    description: 'User interface, user experience and product design.',
    status: 1,
  },
  {
    name: 'Quality Assurance',
    description: 'Manual testing, automation testing and software quality assurance.',
    status: 1,
  },
  {
    name: 'DevOps & Cloud',
    description: 'Cloud infrastructure, CI/CD pipelines and deployment management.',
    status: 1,
  },
  {
    name: 'Database Administration',
    description: 'Database design, management, optimization and maintenance.',
    status: 1,
  },
  {
    name: 'Cybersecurity',
    description: 'Application security, infrastructure security and risk prevention.',
    status: 1,
  },
  {
    name: 'AI & Machine Learning',
    description: 'Artificial intelligence, machine learning and generative AI development.',
    status: 1,
  },
  {
    name: 'Data Engineering & Analytics',
    description: 'Data processing, analytics, reporting and business intelligence.',
    status: 1,
  },
  {
    name: 'Project Management',
    description: 'Project planning, resource allocation, execution and delivery.',
    status: 1,
  },
  {
    name: 'Product Management',
    description: 'Product strategy, roadmap planning and product lifecycle management.',
    status: 1,
  },
  {
    name: 'Business Analysis',
    description: 'Business requirements gathering, analysis and documentation.',
    status: 1,
  },
  {
    name: 'Sales & Business Development',
    description: 'Client acquisition, sales activities and business growth.',
    status: 1,
  },
  {
    name: 'Marketing',
    description: 'Digital marketing, SEO, branding and promotional activities.',
    status: 1,
  },
  {
    name: 'Human Resources',
    description: 'Recruitment, employee management, payroll coordination and HR operations.',
    status: 1,
  },
  {
    name: 'Administration',
    description: 'Office administration, facilities and general administrative operations.',
    status: 1,
  },
  {
    name: 'Finance & Accounts',
    description: 'Accounting, financial management, taxation and billing.',
    status: 1,
  },
  {
    name: 'Customer & Technical Support',
    description: 'Customer assistance, technical support and issue resolution.',
    status: 1,
  },
  {
    name: 'IT Infrastructure & Networking',
    description: 'Internal IT systems, hardware, networking and server administration.',
    status: 1,
  },
  {
    name: 'Legal & Compliance',
    description: 'Legal documentation, regulatory compliance and risk management.',
    status: 1,
  },
  {
    name: 'Procurement & Purchase',
    description: 'Vendor management, purchasing and procurement operations.',
    status: 1,
  },
  {
    name: 'Research & Development',
    description: 'Technology research, innovation and new solution development.',
    status: 1,
  },
  {
    name: 'Documentation & Training',
    description: 'Technical documentation, employee training and knowledge management.',
    status: 1,
  },
];

const designations = [
  // Executive Management
  {
    name: 'Chief Executive Officer (CEO)',
    description: 'Responsible for overall company leadership and strategic direction.',
    status: 1,
  },
  {
    name: 'Chief Technology Officer (CTO)',
    description: 'Responsible for technology strategy and engineering leadership.',
    status: 1,
  },
  {
    name: 'Chief Operating Officer (COO)',
    description: 'Responsible for overall business operations.',
    status: 1,
  },
  {
    name: 'Chief Financial Officer (CFO)',
    description: 'Responsible for financial strategy and management.',
    status: 1,
  },
  {
    name: 'Managing Director',
    description: 'Responsible for company management and business performance.',
    status: 1,
  },
  {
    name: 'Director',
    description: 'Responsible for organizational leadership and strategic decisions.',
    status: 1,
  },
  {
    name: 'General Manager',
    description: 'Responsible for managing business operations and teams.',
    status: 1,
  },

  // Software Development
  {
    name: 'Software Developer Intern',
    description: 'Assists with software development and technical learning.',
    status: 1,
  },
  {
    name: 'Junior Software Developer',
    description: 'Develops and maintains software under senior supervision.',
    status: 1,
  },
  {
    name: 'Software Developer',
    description: 'Develops, tests and maintains software applications.',
    status: 1,
  },
  {
    name: 'Senior Software Developer',
    description: 'Handles complex development tasks and mentors developers.',
    status: 1,
  },
  {
    name: 'Software Engineer',
    description: 'Designs and implements scalable software solutions.',
    status: 1,
  },
  {
    name: 'Technical Lead',
    description: 'Leads technical implementation and guides development teams.',
    status: 1,
  },
  {
    name: 'Engineering Manager',
    description: 'Manages engineering teams and technical delivery.',
    status: 1,
  },
  {
    name: 'Frontend Developer',
    description: 'Develops responsive and interactive user interfaces.',
    status: 1,
  },
  {
    name: 'Senior Frontend Developer',
    description: 'Develops advanced frontend solutions and optimizes performance.',
    status: 1,
  },
  {
    name: 'Backend Developer',
    description: 'Develops server-side applications, APIs and business logic.',
    status: 1,
  },
  {
    name: 'Senior Backend Developer',
    description: 'Designs scalable backend architecture and integrations.',
    status: 1,
  },
  {
    name: 'Full Stack Developer',
    description: 'Develops frontend and backend application functionality.',
    status: 1,
  },
  {
    name: 'Senior Full Stack Developer',
    description: 'Handles end-to-end application architecture and development.',
    status: 1,
  },
  {
    name: 'Mobile App Developer',
    description: 'Develops and maintains mobile applications.',
    status: 1,
  },
  {
    name: 'React Native Developer',
    description: 'Develops cross-platform mobile applications using React Native.',
    status: 1,
  },
  {
    name: 'Flutter Developer',
    description: 'Develops cross-platform mobile applications using Flutter.',
    status: 1,
  },

  // UI/UX Design
  {
    name: 'UI Designer',
    description: 'Designs visual layouts and interface components.',
    status: 1,
  },
  {
    name: 'UX Designer',
    description: 'Researches and improves user experience and usability.',
    status: 1,
  },
  {
    name: 'UI/UX Designer',
    description: 'Creates user-friendly and visually appealing digital experiences.',
    status: 1,
  },
  {
    name: 'Graphic Designer',
    description: 'Creates visual graphics and marketing materials.',
    status: 1,
  },
  {
    name: 'Product Designer',
    description: 'Designs complete digital product experiences.',
    status: 1,
  },

  // Quality Assurance
  { name: 'QA Intern', description: 'Assists in software testing and quality checks.', status: 1 },
  {
    name: 'QA Engineer',
    description: 'Tests software applications and identifies defects.',
    status: 1,
  },
  {
    name: 'Manual Tester',
    description: 'Performs manual testing of software functionality.',
    status: 1,
  },
  {
    name: 'Automation Tester',
    description: 'Develops and executes automated test scripts.',
    status: 1,
  },
  {
    name: 'Senior QA Engineer',
    description: 'Handles complex testing and quality processes.',
    status: 1,
  },
  {
    name: 'QA Lead',
    description: 'Leads testing teams and manages quality assurance activities.',
    status: 1,
  },
  {
    name: 'QA Manager',
    description: 'Manages testing strategy and quality assurance operations.',
    status: 1,
  },

  // DevOps & Cloud
  {
    name: 'DevOps Engineer',
    description: 'Manages deployment pipelines and infrastructure automation.',
    status: 1,
  },
  {
    name: 'Senior DevOps Engineer',
    description: 'Designs and maintains scalable DevOps infrastructure.',
    status: 1,
  },
  {
    name: 'Cloud Engineer',
    description: 'Manages cloud infrastructure and cloud-based services.',
    status: 1,
  },
  {
    name: 'System Administrator',
    description: 'Maintains servers, operating systems and IT infrastructure.',
    status: 1,
  },
  {
    name: 'Network Engineer',
    description: 'Manages network infrastructure and connectivity.',
    status: 1,
  },

  // Database
  {
    name: 'Database Administrator',
    description: 'Manages database security, backup and performance.',
    status: 1,
  },
  {
    name: 'Database Developer',
    description: 'Develops database structures, queries and stored procedures.',
    status: 1,
  },
  { name: 'Database Architect', description: 'Designs scalable database architecture.', status: 1 },

  // AI & Data
  {
    name: 'AI Engineer',
    description: 'Develops artificial intelligence-based applications.',
    status: 1,
  },
  {
    name: 'Machine Learning Engineer',
    description: 'Builds and deploys machine learning models.',
    status: 1,
  },
  { name: 'Data Analyst', description: 'Analyzes business data and prepares reports.', status: 1 },
  {
    name: 'Data Engineer',
    description: 'Builds and maintains data pipelines and infrastructure.',
    status: 1,
  },
  {
    name: 'Data Scientist',
    description: 'Uses statistical methods and machine learning to analyze data.',
    status: 1,
  },

  // Project & Product Management
  {
    name: 'Project Coordinator',
    description: 'Coordinates project activities and schedules.',
    status: 1,
  },
  {
    name: 'Project Manager',
    description: 'Plans and manages project execution and delivery.',
    status: 1,
  },
  {
    name: 'Senior Project Manager',
    description: 'Manages complex projects and delivery teams.',
    status: 1,
  },
  {
    name: 'Scrum Master',
    description: 'Facilitates Agile processes and sprint activities.',
    status: 1,
  },
  {
    name: 'Program Manager',
    description: 'Coordinates multiple related projects and initiatives.',
    status: 1,
  },
  {
    name: 'Product Owner',
    description: 'Manages product backlog and prioritizes requirements.',
    status: 1,
  },
  {
    name: 'Product Manager',
    description: 'Manages product strategy, roadmap and lifecycle.',
    status: 1,
  },
  {
    name: 'Business Analyst',
    description: 'Analyzes business requirements and prepares functional documentation.',
    status: 1,
  },
  {
    name: 'Senior Business Analyst',
    description: 'Handles complex requirements and stakeholder communication.',
    status: 1,
  },

  // Sales & Marketing
  {
    name: 'Business Development Executive',
    description: 'Identifies business opportunities and generates leads.',
    status: 1,
  },
  {
    name: 'Business Development Manager',
    description: 'Manages business development strategies and sales teams.',
    status: 1,
  },
  {
    name: 'Sales Executive',
    description: 'Handles client communication and sales activities.',
    status: 1,
  },
  { name: 'Sales Manager', description: 'Manages sales targets and sales teams.', status: 1 },
  { name: 'Account Manager', description: 'Manages client relationships and accounts.', status: 1 },
  {
    name: 'Pre-Sales Consultant',
    description: 'Prepares proposals, estimates and product demonstrations.',
    status: 1,
  },
  {
    name: 'Digital Marketing Executive',
    description: 'Executes digital marketing campaigns.',
    status: 1,
  },
  {
    name: 'SEO Executive',
    description: 'Optimizes websites for search engine visibility.',
    status: 1,
  },
  {
    name: 'Social Media Executive',
    description: 'Manages company social media platforms.',
    status: 1,
  },
  {
    name: 'Content Writer',
    description: 'Creates website, marketing and technical content.',
    status: 1,
  },
  { name: 'Marketing Manager', description: 'Plans and manages marketing strategies.', status: 1 },

  // HR & Administration
  { name: 'HR Executive', description: 'Handles employee records and HR operations.', status: 1 },
  { name: 'HR Manager', description: 'Manages human resources and employee relations.', status: 1 },
  {
    name: 'Talent Acquisition Executive',
    description: 'Manages recruitment and candidate sourcing.',
    status: 1,
  },
  {
    name: 'Recruitment Manager',
    description: 'Leads recruitment and hiring operations.',
    status: 1,
  },
  {
    name: 'Payroll Executive',
    description: 'Manages salary processing and payroll records.',
    status: 1,
  },
  {
    name: 'Admin Executive',
    description: 'Handles office administration and daily operations.',
    status: 1,
  },
  {
    name: 'Office Administrator',
    description: 'Manages office facilities and administrative activities.',
    status: 1,
  },

  // Finance & Accounts
  {
    name: 'Accountant',
    description: 'Maintains financial records and accounting transactions.',
    status: 1,
  },
  {
    name: 'Junior Accountant',
    description: 'Assists with bookkeeping and financial records.',
    status: 1,
  },
  {
    name: 'Senior Accountant',
    description: 'Manages accounting operations and financial reporting.',
    status: 1,
  },
  {
    name: 'Finance Executive',
    description: 'Handles financial operations and documentation.',
    status: 1,
  },
  {
    name: 'Finance Manager',
    description: 'Manages budgeting, financial planning and reporting.',
    status: 1,
  },

  // Customer & Technical Support
  {
    name: 'Customer Support Executive',
    description: 'Handles customer queries and service requests.',
    status: 1,
  },
  {
    name: 'Technical Support Engineer',
    description: 'Resolves technical issues and provides assistance.',
    status: 1,
  },
  {
    name: 'Application Support Engineer',
    description: 'Maintains applications and resolves production issues.',
    status: 1,
  },
  {
    name: 'L1 Support Engineer',
    description: 'Handles initial-level technical support requests.',
    status: 1,
  },
  {
    name: 'L2 Support Engineer',
    description: 'Handles advanced technical support and troubleshooting.',
    status: 1,
  },
  {
    name: 'Support Manager',
    description: 'Manages customer and technical support operations.',
    status: 1,
  },
  {
    name: 'Customer Success Manager',
    description: 'Manages customer satisfaction and retention.',
    status: 1,
  },

  // Legal, Procurement & Documentation
  {
    name: 'Legal Executive',
    description: 'Handles legal documentation and administrative compliance.',
    status: 1,
  },
  {
    name: 'Compliance Officer',
    description: 'Monitors regulatory and company compliance.',
    status: 1,
  },
  {
    name: 'Purchase Executive',
    description: 'Handles purchasing and vendor coordination.',
    status: 1,
  },
  {
    name: 'Procurement Manager',
    description: 'Manages procurement strategies and vendor relationships.',
    status: 1,
  },
  {
    name: 'Technical Writer',
    description: 'Prepares technical documentation and user guides.',
    status: 1,
  },
  {
    name: 'Technical Trainer',
    description: 'Provides technical training and knowledge sharing.',
    status: 1,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const deptRows = departments.map((d) => ({
      name: d.name,
      description: d.description,
      status: d.status ?? 1,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('departments', deptRows, {
      updateOnDuplicate: ['description', 'status', 'updatedAt'],
    });

    const desigRows = designations.map((d) => ({
      name: d.name,
      description: d.description,
      status: d.status ?? 1,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('designations', desigRows, {
      updateOnDuplicate: ['description', 'status', 'updatedAt'],
    });
  },

  async down(queryInterface) {
    const deptNames = departments.map((d) => d.name);
    const desigNames = designations.map((d) => d.name);

    await queryInterface.bulkDelete('departments', { name: deptNames }, {});
    await queryInterface.bulkDelete('designations', { name: desigNames }, {});
  },
};
