# 10 — RBAC Model

## Roles (per project)

Roles are ordered; a higher role implies all lower permissions.

```
viewer < member < admin < owner
```

## Permission matrix

| Action | viewer | member | admin | owner |
|---|---|---|---|---|
| View project, experiments, datasets, graph, memory, timeline | ✓ | ✓ | ✓ | ✓ |
| Search, read chat history | ✓ | ✓ | ✓ | ✓ |
| Create/update experiments, datasets, uploads | | ✓ | ✓ | ✓ |
| Chat with agents, request investigations | | ✓ | ✓ | ✓ |
| Manage integrations (GitHub, MLflow) | | | ✓ | ✓ |
| Invite/remove members, change roles (≤ admin) | | | ✓ | ✓ |
| Update project settings | | | ✓ | ✓ |
| Delete project, transfer ownership | | | | ✓ |

Invariants: exactly one owner (DB partial unique index); owner cannot leave or be demoted without transferring ownership; admins cannot modify owner or other admins' roles upward.

## Enforcement

One dependency factory, used by every project-scoped router:

```python
def require_project_role(minimum: Role):
    async def dep(
        project_id: UUID,
        auth: AuthContext = Depends(get_current_auth),
        members: MembershipRepository = Depends(get_membership_repo),
    ) -> ProjectContext:
        role = await members.role_of(project_id, auth.user.id)
        if role is None:
            raise NotFoundError("project")          # hide existence
        if role < minimum:
            raise PermissionDeniedError(...)
        if auth.via == "api_key" and not auth.scopes_allow(minimum):
            raise PermissionDeniedError("api key scope")
        return ProjectContext(project_id=project_id, user=auth.user, role=role)
    return dep
```

- Non-members receive **404**, never 403, to avoid leaking project existence.
- API key scope mapping: `read` → viewer-level, `write` → member-level, `admin` → admin-level actions.
- Services trust `ProjectContext`; authorization never re-implemented in services (single enforcement point), but destructive service methods assert the required role defensively.

## V2/V3: Teams

The `teams` tables and contracts exist ([03](03-domain-model.md)); when the `teams` capability is enabled, team membership will grant baseline project roles via a resolution order (direct member role wins over team-derived role). The membership repository interface already accepts this resolution seam.
