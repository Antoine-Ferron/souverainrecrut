import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

const { SONAR_HOST_URL, SONAR_AUTH_TOKEN } = process.env;
const project = 'souverainrecrut-backend';
const metadata = await readFile('backend/.scannerwork/report-task.txt', 'utf8');
const taskId = /^ceTaskId=(.+)$/m.exec(metadata)?.[1].trim();
if (!taskId) throw new Error('Identifiant analyse SonarQube absent');

async function query(path, params) {
  const url = new URL(path, SONAR_HOST_URL);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${SONAR_AUTH_TOKEN}` } });
  if (!response.ok) throw new Error(`SonarQube ${path} : HTTP ${response.status}`);
  return response.json();
}

let task;
do {
  ({ task } = await query('/api/ce/task', { id: taskId }));
  if (task.status === 'SUCCESS') break;
  if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
    throw new Error(`Analyse SonarQube ${taskId} : ${task.status}`);
  }
  await setTimeout(3000);
} while (true);

if (!task.analysisId) throw new Error('Identifiant du résultat SonarQube absent');
const gate = await query('/api/qualitygates/project_status', { analysisId: task.analysisId });
const metrics = await query('/api/measures/component', {
  component: project,
  metricKeys: 'bugs,vulnerabilities,code_smells,security_hotspots,duplicated_lines_density,coverage,ncloc',
});
await writeFile('run-reports/sonar.json', JSON.stringify({
  revision: process.env.REVISION, analysisId: task.analysisId, ...gate, ...metrics,
}, null, 2) + '\n');
console.log(`Quality Gate : ${gate.projectStatus.status}`);
if (gate.projectStatus.status !== 'OK') process.exitCode = 1;
