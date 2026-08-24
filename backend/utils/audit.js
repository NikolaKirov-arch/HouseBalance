async function addAuditLog(connection, entry) {
  const {
    groupId,
    actorMemberId,
    actionType,
    entityType,
    entityId,
    description = null
  } = entry;

  await connection.execute(
    `INSERT INTO audit_log
       (group_id, actor_member_id, action_type, entity_type, entity_id, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [groupId, actorMemberId, actionType, entityType, entityId, description]
  );
}

module.exports = addAuditLog;

