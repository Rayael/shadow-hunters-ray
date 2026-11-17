# Legacy Python files

The active deploy target is the Node.js/TypeScript application in `packages/`, configured through `render.yaml` and the Node `Procfile`. The older Python/Flask files and Python deployment configuration at the repository root are not used by that Node deployment. They are retained for now because the repository-writing interface cannot remove tracked files; do not use them to deploy the current application.
