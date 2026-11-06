const { AuditLog } = require('../models');

/** Append-only audit trail for material business actions. Never throws into the caller's flow. */
async function audit(actor, action, entity, entityId, meta = {}) {
  try {
    await AuditLog.create({
      actor: actor?.id,
      actorRole: actor?.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      meta,
    });
  } catch (e) {
    console.error('audit failed', e.message);
  }
}

module.exports = { audit };
