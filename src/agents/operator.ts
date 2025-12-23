import simpleGit from 'simple-git';

export async function runOperator(task: any) {
  // task: { repoPath, branchName, patch, prTitle }
  const git = simpleGit(task.repoPath);
  const branch = task.branchName || `lg/auto-${Date.now()}`;
  await git.checkoutLocalBranch(branch);
  // apply patch assumed already applied to filesystem; commit
  await git.add('.');
  await git.commit(task.prTitle || 'chore: apply automated patch');
  // push - remote configured
  if (task.push !== false) {
    await git.push('origin', branch);
  }
  return { role: 'operator', branch };
}
