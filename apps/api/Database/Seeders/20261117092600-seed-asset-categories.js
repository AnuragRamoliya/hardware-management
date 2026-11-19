'use strict';

const assetCategories = [
  {
    name: 'Laptop',
    description: 'Company laptops and portable computers.',
    status: 1,
  },
  {
    name: 'Desktop Computer',
    description: 'Desktop PCs, workstations and personal computers.',
    status: 1,
  },
  {
    name: 'Monitor & Display',
    description: 'LED, LCD and external display monitors.',
    status: 1,
  },
  {
    name: 'Keyboard & Mouse',
    description: 'Wired and wireless keyboards and mouse devices.',
    status: 1,
  },
  {
    name: 'Laptop Accessories',
    description: 'Laptop stands, cooling pads, docking stations and accessories.',
    status: 1,
  },
  {
    name: 'Printer',
    description: 'Laser, inkjet and multifunction printers.',
    status: 1,
  },
  {
    name: 'Scanner',
    description: 'Document scanners and barcode scanners.',
    status: 1,
  },
  {
    name: 'Server',
    description: 'Physical servers, rack servers and computing servers.',
    status: 1,
  },
  {
    name: 'Storage Devices',
    description: 'Hard disks, SSDs, NAS and external storage devices.',
    status: 1,
  },
  {
    name: 'Networking Equipment',
    description: 'Routers, switches, modems and wireless access points.',
    status: 1,
  },
  {
    name: 'Firewall & Security Devices',
    description: 'Hardware firewalls and network security devices.',
    status: 1,
  },
  {
    name: 'Cables & Connectors',
    description: 'HDMI, VGA, USB, Type-C, LAN, audio and other connection cables.',
    status: 1,
  },
  {
    name: 'Display Converters & Adapters',
    description: 'VGA, HDMI, DisplayPort, DVI and Type-C display converters and adapters.',
    status: 1,
  },
  {
    name: 'USB Hubs & Splitters',
    description: 'USB hubs, HDMI splitters, VGA splitters and connectivity expansion devices.',
    status: 1,
  },
  {
    name: 'Network Connectors & Accessories',
    description: 'RJ45 connectors, LAN couplers, patch cords and networking accessories.',
    status: 1,
  },
  {
    name: 'Audio & Video Accessories',
    description: 'AUX, RCA, optical audio cables and audio/video adapters.',
    status: 1,
  },
  {
    name: 'Power Cables & Adapters',
    description: 'Power cables, extension boards, charging adapters and power connectors.',
    status: 1,
  },
  {
    name: 'Cable Management Accessories',
    description: 'Cable ties, organizers, protectors and cable management equipment.',
    status: 1,
  },
  {
    name: 'UPS & Power Backup',
    description: 'UPS systems, inverters and backup batteries.',
    status: 1,
  },
  {
    name: 'Projector & Display',
    description: 'Projectors, smart displays and presentation screens.',
    status: 1,
  },
  {
    name: 'Mobile Phones',
    description: 'Company-issued smartphones and mobile devices.',
    status: 1,
  },
  {
    name: 'Tablets',
    description: 'Tablets, iPads and portable touchscreen devices.',
    status: 1,
  },
  {
    name: 'Headphones & Headsets',
    description: 'Wired and wireless headphones and communication headsets.',
    status: 1,
  },
  {
    name: 'Webcam',
    description: 'External webcams and video capture devices.',
    status: 1,
  },
  {
    name: 'Microphone & Speakers',
    description: 'Microphones, desktop speakers and audio equipment.',
    status: 1,
  },
  {
    name: 'Video Conferencing Equipment',
    description: 'Conference cameras and meeting room video equipment.',
    status: 1,
  },
  {
    name: 'Software & Licenses',
    description: 'Purchased software, applications and subscription licenses.',
    status: 1,
  },
  {
    name: 'Operating System Licenses',
    description: 'Windows, Linux and other operating system licenses.',
    status: 1,
  },
  {
    name: 'Cloud & Hosting Services',
    description: 'Cloud infrastructure, hosting and subscription services.',
    status: 1,
  },
  {
    name: 'Security Software',
    description: 'Antivirus, endpoint protection and security applications.',
    status: 1,
  },
  {
    name: 'Office Furniture',
    description: 'Office desks, tables and employee workstations.',
    status: 1,
  },
  {
    name: 'Office Chairs',
    description: 'Employee chairs, executive chairs and visitor chairs.',
    status: 1,
  },
  {
    name: 'Storage Furniture',
    description: 'Office cabinets, drawers, shelves and storage units.',
    status: 1,
  },
  {
    name: 'Air Conditioning',
    description: 'Air conditioners and office cooling equipment.',
    status: 1,
  },
  {
    name: 'Electrical Equipment',
    description: 'Electrical accessories, wiring and power equipment.',
    status: 1,
  },
  {
    name: 'Office Equipment',
    description: 'Office machines and general administrative equipment.',
    status: 1,
  },
  {
    name: 'Biometric Devices',
    description: 'Fingerprint scanners, face recognition and attendance devices.',
    status: 1,
  },
  {
    name: 'CCTV & Surveillance',
    description: 'CCTV cameras, recording systems and surveillance equipment.',
    status: 1,
  },
  {
    name: 'Access Control Devices',
    description: 'Smart locks, RFID readers and access control cards.',
    status: 1,
  },
  {
    name: 'Fire Safety Equipment',
    description: 'Fire extinguishers, smoke detectors and safety equipment.',
    status: 1,
  },
  {
    name: 'Stationery & Supplies',
    description: 'Office stationery, paper and general office consumables.',
    status: 1,
  },
  {
    name: 'Computer Components',
    description: 'RAM, processors, motherboards, graphics cards and internal components.',
    status: 1,
  },
  {
    name: 'Batteries & Chargers',
    description: 'Laptop chargers, mobile chargers and replacement batteries.',
    status: 1,
  },
  {
    name: 'Other Assets',
    description: 'Company assets that do not belong to existing categories.',
    status: 1,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const rows = assetCategories.map((c) => ({
      name: c.name,
      description: c.description,
      status: c.status ?? 1,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('asset_categories', rows, {
      updateOnDuplicate: ['description', 'status', 'updatedAt'],
    });
  },

  async down(queryInterface) {
    const names = assetCategories.map((c) => c.name);
    await queryInterface.bulkDelete('asset_categories', { name: names }, {});
  },
};
