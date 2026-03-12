export const DEMO_PROJECTS = ['APP', 'WEB'];
export const ENGINEERS = [
  { accountId: 'e1', displayName: 'Alice Chen' },
  { accountId: 'e2', displayName: 'Bob Smith' },
  { accountId: 'e3', displayName: 'Charlie Davis' },
  { accountId: 'e4', displayName: 'Diana Prince' },
  { accountId: 'e5', displayName: 'Ethan Hunt' },
];

const ISSUE_TYPES = ['Story', 'Task', 'Bug'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const COMPONENTS = ['Frontend', 'Backend', 'Database', 'API', 'UI'];
const LABELS = ['B2C', 'B2B', 'TechDebt', 'Hotfix', 'Q3_Goal'];

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function generateHistory(createdDate: Date, isDone: boolean, hasRework: boolean, hasBlocker: boolean) {
  const histories = [];
  let currentDate = createdDate;

  // Transition to In Progress
  currentDate = addHours(currentDate, Math.random() * 24 + 2);
  histories.push({
    created: currentDate.toISOString(),
    items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
  });

  if (hasBlocker) {
    currentDate = addHours(currentDate, Math.random() * 48 + 12);
    histories.push({
      created: currentDate.toISOString(),
      items: [{ field: 'status', fromString: 'In Progress', toString: 'Blocked' }],
    });
    currentDate = addHours(currentDate, Math.random() * 72 + 24);
    histories.push({
      created: currentDate.toISOString(),
      items: [{ field: 'status', fromString: 'Blocked', toString: 'In Progress' }],
    });
  }

  // Code Review
  currentDate = addHours(currentDate, Math.random() * 72 + 10);
  histories.push({
    created: currentDate.toISOString(),
    items: [{ field: 'status', fromString: 'In Progress', toString: 'Code Review' }],
  });

  if (hasRework) {
    currentDate = addHours(currentDate, Math.random() * 12 + 2);
    histories.push({
      created: currentDate.toISOString(),
      items: [{ field: 'status', fromString: 'Code Review', toString: 'In Progress' }],
    });
    currentDate = addHours(currentDate, Math.random() * 24 + 10);
    histories.push({
      created: currentDate.toISOString(),
      items: [{ field: 'status', fromString: 'In Progress', toString: 'Code Review' }],
    });
  }

  // QA
  currentDate = addHours(currentDate, Math.random() * 24 + 2);
  histories.push({
    created: currentDate.toISOString(),
    items: [{ field: 'status', fromString: 'Code Review', toString: 'QA' }],
  });

  if (isDone) {
    currentDate = addHours(currentDate, Math.random() * 48 + 4);
    histories.push({
      created: currentDate.toISOString(),
      items: [{ field: 'status', fromString: 'QA', toString: 'Done' }],
    });
  }

  return { histories, lastDate: currentDate };
}

export function generateMockIssues(projectKey: string, count = 100): any[] {
  const issues = [];
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const epics = [];
  for (let i = 1; i <= 5; i++) {
    epics.push({
      key: `${projectKey}-E${i}`,
      summary: `Strategic Epic ${i} for ${projectKey}`,
    });
  }

  for (let i = 0; i < count; i++) {
    const epic = epics[Math.floor(Math.random() * epics.length)];
    const assignee = ENGINEERS[Math.floor(Math.random() * ENGINEERS.length)];
    const issueType = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    const component = COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)];
    const label = LABELS[Math.floor(Math.random() * LABELS.length)];
    
    const isDone = Math.random() > 0.15;
    const hasRework = Math.random() > 0.8;
    const hasBlocker = Math.random() > 0.85;

    const createdDate = randomDateBetween(threeMonthsAgo, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
    const { histories, lastDate } = generateHistory(createdDate, isDone, hasRework, hasBlocker);

    issues.push({
      key: `${projectKey}-${i + 1}`,
      fields: {
        summary: `Implement ${component} feature ${i + 1} [Demo]`,
        status: { name: isDone ? 'Done' : (histories.length > 0 ? histories[histories.length - 1].items[0].toString : 'To Do') },
        assignee: { displayName: assignee.displayName, accountId: assignee.accountId },
        issuetype: { name: issueType },
        priority: { name: priority },
        created: createdDate.toISOString(),
        resolutiondate: isDone ? lastDate.toISOString() : null,
        updated: lastDate.toISOString(),
        customfield_sp: Math.floor(Math.random() * 8) + 1,
        parent: { key: epic.key, fields: { summary: epic.summary } },
        components: [{ name: component }],
        labels: [label],
      },
      changelog: { histories },
    });
  }

  return issues;
}
