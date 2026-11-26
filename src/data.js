export const themes = [
  { name: 'Poverty-free & enhanced livelihoods', short: 'Livelihoods', score: 62, color: '#d8a34c', icon: '◒' },
  { name: 'Healthy Panchayat', short: 'Health', score: 75, color: '#dd806b', icon: '✳' },
  { name: 'Child-friendly Panchayat', short: 'Child-friendly', score: 80, color: '#77a6c0', icon: '⌂' },
  { name: 'Water-sufficient Panchayat', short: 'Water', score: 45, color: '#4d9b9a', icon: '◉' },
  { name: 'Clean and green Panchayat', short: 'Clean & green', score: 58, color: '#78a67e', icon: '❋' },
  { name: 'Self-sufficient infrastructure', short: 'Infrastructure', score: 70, color: '#a18ab6', icon: '⌘' },
  { name: 'Socially just & secure Panchayat', short: 'Social justice', score: 65, color: '#c78e70', icon: '♡' },
  { name: 'Panchayat with good governance', short: 'Governance', score: 72, color: '#7a9a7a', icon: '◎' },
  { name: 'Women-friendly Panchayat', short: 'Women', score: 55, color: '#cf879b', icon: '✿' },
];

export const complaints = [
  { id: 'GV-2026-0148', title: 'No water supply for three days', category: 'Water', ward: 'Ward 3 · Bhanpur East', date: 'Today, 9:42 AM', status: 'In progress', color: 'amber', initials: 'RK' },
  { id: 'GV-2026-0146', title: 'Streetlight not working near school', category: 'Electricity', ward: 'Ward 1 · Main road', date: 'Yesterday', status: 'Under review', color: 'blue', initials: 'AS' },
  { id: 'GV-2026-0141', title: 'Garbage collection missed this week', category: 'Sanitation', ward: 'Ward 4 · Harijan basti', date: '18 Nov 2026', status: 'Resolved', color: 'green', initials: 'MP' },
];

export const projects = [
  { id: 'GP-2026-001', title: 'Drinking water pipeline · Ward 3', category: 'Water & sanitation', budget: '₹12,00,000', spent: 780000, progress: 65, status: 'In progress', date: 'Expected 15 Dec 2026', ward: 'Ward 3' },
  { id: 'GP-2026-004', title: 'Road resurfacing · School approach', category: 'Infrastructure', budget: '₹8,40,000', spent: 840000, progress: 100, status: 'Completed', date: 'Completed 12 Nov 2026', ward: 'Ward 1' },
  { id: 'GP-2026-007', title: 'Solar streetlights · Market lane', category: 'Energy', budget: '₹3,20,000', spent: 96000, progress: 30, status: 'In progress', date: 'Expected 28 Jan 2027', ward: 'Ward 2' },
];

export const schemes = [
  { title: 'Rural housing assistance', hindi: 'ग्रामीण आवास सहायता', category: 'Housing', description: 'Support for eligible rural households to build a permanent home.', icon: '⌂', color: 'peach', eligibility: 'Households identified through the applicable official housing list. Eligibility must be confirmed with the Panchayat.' },
  { title: 'Farmer income support', hindi: 'किसान आय सहायता', category: 'Agriculture', description: 'Income support for eligible landholding farmer families.', icon: '❋', color: 'sage', eligibility: 'Landholding and other eligibility conditions apply. Check the current official guidelines and beneficiary records.' },
  { title: 'Rural employment programme', hindi: 'ग्रामीण रोजगार कार्यक्रम', category: 'Employment', description: 'Wage employment opportunities and local public works information.', icon: '✳', color: 'blue', eligibility: 'Current programme rules and registration requirements apply. Ask the Panchayat employment assistant.' },
  { title: 'Clean water connections', hindi: 'स्वच्छ जल कनेक्शन', category: 'Water', description: 'Learn about household tap connections and local water services.', icon: '◉', color: 'lavender', eligibility: 'Service availability and connection processes vary by village. Contact the local water committee.' },
];

export const meetings = [
  { day: '28', month: 'NOV', title: 'Gram Sabha · Winter session', time: 'Saturday · 10:30 AM', place: 'Panchayat Bhawan, Bhanpur', type: 'Upcoming' },
  { day: '12', month: 'DEC', title: 'Ward Sabha · Ward 3', time: 'Saturday · 11:00 AM', place: 'Community water point, Ward 3', type: 'Ward Sabha' },
];

export const activity = [
  { icon: 'check', title: 'Road resurfacing marked complete', detail: 'School approach · Ward 1', time: '2 hours ago', tone: 'green' },
  { icon: 'drop', title: 'Water complaint assigned to Jal Samiti', detail: 'Complaint GV-2026-0148 · Ward 3', time: '5 hours ago', tone: 'blue' },
  { icon: 'calendar', title: 'Gram Sabha agenda published', detail: 'Winter session · 28 November', time: 'Yesterday', tone: 'gold' },
];
