import React from 'react';
import { ArrowRight, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Exhaustive union of every possible VIP membership tier. */
export type VipLevel = 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

/** Exhaustive union of every possible member account status. */
export type MemberStatus = 'Active' | 'Inactive' | 'Suspended';

export interface MemberRow {
  /** Full display name of the member. */
  name: string;
  /** Contact email address (also used as a unique row key). */
  email: string;
  /** Membership tier assigned to this member. */
  vipLevel: VipLevel;
  /** ISO-8601 date string when the member registered, e.g. "2026-03-19". */
  joinDate: string;
  /** Current account status. */
  status: MemberStatus;
}

export interface RecentMembersTableProps {
  /** Ordered list of newly registered members (most recent first by convention). */
  members: MemberRow[];
  /** Invoked when the user clicks the "View All" CTA. */
  onViewAll: () => void;
}

// ─── Presentational helpers ───────────────────────────────────────────────────

/** Badge Tailwind classes per VIP tier. Purely a visual mapping. */
const VIP_BADGE: Record<VipLevel, string> = {
  Platinum: 'bg-sky-100    text-sky-700',
  Gold:     'bg-amber-100  text-amber-700',
  Silver:   'bg-slate-100  text-slate-600',
  Bronze:   'bg-orange-100 text-orange-700',
};

/** Status icon + colour per member status. Purely a visual mapping. */
const STATUS_ICON: Record<
  MemberStatus,
  { Icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  Active:    { Icon: CheckCircle,  className: 'text-emerald-600', label: 'Active'    },
  Inactive:  { Icon: MinusCircle, className: 'text-slate-400',   label: 'Inactive'  },
  Suspended: { Icon: XCircle,     className: 'text-red-500',     label: 'Suspended' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * RecentMembersTable — tabular view of newly registered members.
 *
 * Pure presentational component. No internal state.
 * Interaction callbacks are fully prop-injected.
 */
export function RecentMembersTable({
  members,
  onViewAll,
}: RecentMembersTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recently Registered Members</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={onViewAll}
        >
          View All
          <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recently registered members">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  VIP Level
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground text-xs font-medium">
                  Join Date
                </th>
                <th className="text-right px-4 py-2 text-muted-foreground text-xs font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => {
                const { Icon: StatusIcon, className: statusCls, label: statusLabel } =
                  STATUS_ICON[member.status];

                return (
                  <tr
                    key={member.email}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-sm">{member.name}</td>

                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {member.email}
                    </td>

                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${VIP_BADGE[member.vipLevel]}`}
                      >
                        {member.vipLevel}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 text-sm text-muted-foreground tabular-nums">
                      {member.joinDate}
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusCls}`}>
                        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No recently registered members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
