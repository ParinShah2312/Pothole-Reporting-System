import { statusColor, statusLabel } from '../../utils/status.js';

export default function StatusBadge({ status }) {
  return <span className="badge" style={{ '--badge': statusColor(status) }}>{statusLabel(status)}</span>;
}
