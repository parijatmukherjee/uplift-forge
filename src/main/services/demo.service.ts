import { processIssue, persistCaches, clearAllCaches } from './ticket.service.js';
import { updateConfig, resetConfig } from './config.service.js';
import { saveCredentials, clearCredentials, emitAuthStateChanged } from '../auth/token-store.js';
import { invalidateTimelineCache } from './timeline.service.js';
import { deleteAiConfig } from '../auth/ai-key-store.js';
import { DEMO_PROJECTS, ENGINEERS, generateMockIssues } from './demo-data.service.js';

export async function setupDemoMode() {
  console.log('[Demo] Initializing demo mode...');
  
  // 1. Wipe existing state (full reset)
  clearCredentials();
  resetConfig();
  clearAllCaches();
  invalidateTimelineCache();
  deleteAiConfig();
  
  // 2. Set mock credentials
  saveCredentials('https://demo.atlassian.net', 'demo@example.com', 'demo-token');
  emitAuthStateChanged();

  // 3. Configure App settings
  updateConfig({
    project_key: 'APP',
    projects: [
      { project_key: 'APP', project_name: 'Mobile App', field_ids: { story_points: 'customfield_sp' } },
      { project_key: 'WEB', project_name: 'Web Platform', field_ids: { story_points: 'customfield_sp' } },
    ],
    field_ids: { story_points: 'customfield_sp' },
    active_statuses: ['In Progress', 'Code Review', 'QA'],
    blocked_statuses: ['Blocked'],
    done_statuses: ['Done', 'Resolved', 'Closed'],
    tracked_engineers: ENGINEERS,
    sp_to_days: 1,
    my_account_id: 'e1',
  });

  // 4. Generate 200 tickets
  console.log('[Demo] Generating mock tickets...');
  for (const proj of DEMO_PROJECTS) {
    const issues = generateMockIssues(proj, 100);
    for (const issue of issues) {
      processIssue(issue, true, proj);
    }
  }

  persistCaches();
  console.log('[Demo] Generated 200 tickets and populated cache.');
}
