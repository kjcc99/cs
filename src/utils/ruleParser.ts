// src/utils/ruleParser.ts

// --- Original Contact Hour Rules ---
export interface ContactHourRule {
    MIN: number;
    MAX: number;
    CONTACT_HOURS: number;
}
export interface ContactHourCalculationRules {
    [key: string]: ContactHourRule;
}
export const parseContactHourCalculationRules = (markdown: string): ContactHourCalculationRules => {
    const rules: ContactHourCalculationRules = {};
    const lines = markdown.split('\n');
    let currentKey = '';
  
    lines.forEach(line => {
      if (line.startsWith('## ')) {
        currentKey = line.substring(3).trim();
        rules[currentKey] = { MIN: 0, MAX: 0, CONTACT_HOURS: 0 };
      } else if (line.startsWith('- MIN:') && currentKey) {
        rules[currentKey].MIN = parseFloat(line.split(':')[1].trim());
      } else if (line.startsWith('- MAX:') && currentKey) {
        rules[currentKey].MAX = parseFloat(line.split(':')[1].trim());
      } else if (line.startsWith('- CONTACT_HOURS:') && currentKey) {
        rules[currentKey].CONTACT_HOURS = parseFloat(line.split(':')[1].trim());
      }
    });
    return rules;
};

// --- New Attendance Accounting Rules ---
export type AttendanceMethod = 'IGNORE_HOLIDAYS' | 'COUNT_HOLIDAYS';
export interface AttendanceAccountingRules {
  [key: string]: {
    METHOD: AttendanceMethod;
    DESCRIPTION: string;
  };
}

export const parseAttendanceAccountingRules = (markdown: string): AttendanceAccountingRules => {
  const rules: AttendanceAccountingRules = {};
  const sections = markdown.split('## ').slice(1);

  sections.forEach(section => {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const methodLine = lines.find(line => line.startsWith('METHOD:'));
    const descriptionLine = lines.find(line => line.startsWith('DESCRIPTION:'));

    if (header && methodLine) {
      const method = methodLine.split(':')[1].trim() as AttendanceMethod;
      const description = descriptionLine ? descriptionLine.split(':')[1].trim() : '';
      rules[header] = { METHOD: method, DESCRIPTION: description };
    }
  });

  return rules;
};
