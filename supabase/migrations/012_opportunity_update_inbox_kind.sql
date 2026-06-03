alter table inbox_messages
drop constraint if exists inbox_messages_kind_check;

alter table inbox_messages
add constraint inbox_messages_kind_check check (
  kind in (
    'booking_requested',
    'booking_approved',
    'booking_rejected',
    'opportunity_updated',
    'membership_requested',
    'membership_accepted',
    'membership_rejected'
  )
);
