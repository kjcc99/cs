// src/utils/ruleParser.ts

// The functions no longer import the markdown files.
// They receive the content as an argument.

// Define interfaces for the parsed rules
export interface ContactHourCalculationRules {
  classHourMinutes: number;
  breakMinutes: number;
  breakCalculationFormula: string;
  contactHourFormula: string;
  schedulingConstraints: string[];
}


/**
 * Parses the contact_hours_rules.md content to extract general calculation rules and constraints.
 * @param markdownContent The raw string content of the markdown file.
 * @returns A ContactHourCalculationRules object.
 */
export function parseContactHourCalculationRules(markdownContent: string): ContactHourCalculationRules {
  const rules: ContactHourCalculationRules = {
    classHourMinutes: 50,
    breakMinutes: 10,
    breakCalculationFormula: '',
    contactHourFormula: '',
    schedulingConstraints: [],
  };

  if (!markdownContent) return rules;

  const lines = markdownContent.split('\n');
  let inSchedulingRulesSection = false;

  lines.forEach(line => {
    if (line.includes('`NumberOfBreaks = floor((TotalClassMinutes - 50) / 60)`')) {
      rules.breakCalculationFormula = 'NumberOfBreaks = floor((TotalClassMinutes - 50) / 60)';
    }
    if (line.includes('`ContactHours = InstructionalMinutes / 50`')) {
      rules.contactHourFormula = 'ContactHours = InstructionalMinutes / 50';
    }
    if (line.includes('## Scheduling Rules and Constraints')) {
      inSchedulingRulesSection = true;
      return;
    }
    if (inSchedulingRulesSection && line.startsWith('*')) {
        rules.schedulingConstraints.push(line.substring(2).trim());
    }
    if (inSchedulingRulesSection && (line.startsWith('##') && !line.includes('Scheduling Rules and Constraints'))) {
        inSchedulingRulesSection = false;
    }
  });

  return rules;
}
