import { Octokit } from 'octokit';

export async function runExecutor(task: any) {
  // task: { owner, repo, prNumber, token }
  // Executor is privileged — implement checks before merging in production
  if (!task.token) throw new Error('Missing token for executor');
  const octo = new Octokit({ auth: task.token });
  const owner = task.owner;
  const repo = task.repo;
  const prNumber = task.prNumber;
  // Simple merge (merge commit)
  const res = await octo.pulls.merge({ owner, repo, pull_number: prNumber });
  return { role: 'executor', merged: res.data.merged };
}
