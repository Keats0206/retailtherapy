import { track } from "@vercel/analytics";

export const AnalyticsEvent = {
  CTA_BROWSE: "cta_browse",
  CTA_APPLY: "cta_apply",
  NAV_BROWSE: "nav_browse",
  NAV_SIGN_IN: "nav_sign_in",
  NAV_SIGN_UP: "nav_sign_up",
  NAV_GO_LIVE: "nav_go_live",
  APPLY_CONTINUE: "apply_continue",
  APPLY_SUBMIT: "apply_submit",
  APPLY_CONFIRMED: "apply_confirmed",
  BROWSE_JOIN_SHOW: "browse_join_show",
  BROWSE_WATCH_REPLAY: "browse_watch_replay",
  CHALLENGE_OPEN: "challenge_open",
  CHALLENGE_ACCEPT: "challenge_accept",
  CHALLENGE_STORE_CLICK: "challenge_store_click",
  CTA_GO_LIVE: "cta_go_live",
  CTA_SCHEDULE_SHOW: "cta_schedule_show",
  HOST_OPEN_STUDIO: "host_open_studio",
  HOST_VIEW_RECAP: "host_view_recap",
  SHOW_DELETE: "show_delete",
  SHOW_END: "show_end",
  HOST_SETUP_INTENT: "host_setup_intent",
  HOST_SETUP_DETAIL: "host_setup_detail",
  HOST_SETUP_ITEMS: "host_setup_items",
  HOST_SETUP_COMPLETE: "host_setup_complete",
  HOST_GO_LIVE: "host_go_live",
  HOST_SCHEDULE_SHOW: "host_schedule_show",
  HOST_MANAGE_SCHEDULED: "host_manage_scheduled",
  HOST_SHARE_LINK: "host_share_link",
  HOST_MIC_TOGGLE: "host_mic_toggle",
  HOST_CAMERA_TOGGLE: "host_camera_toggle",
  HOST_SCREEN_SHARE: "host_screen_share",
  HOST_PIP_STORE_CLICK: "host_pip_store_click",
  HOST_PRODUCT_ADD: "host_product_add",
  HOST_VERSE_START: "host_verse_start",
  HOST_MODE_SWITCH: "host_mode_switch",
  HOST_POLL_LAUNCH: "host_poll_launch",
  WATCH_ENTER: "watch_enter",
  WATCH_LEAVE: "watch_leave",
  REACTION_SENT: "reaction_sent",
  PRODUCT_VOTE: "product_vote",
  PRODUCT_SHOP_CLICK: "product_shop_click",
  ITEM_SAVE: "item_save",
  ITEM_UNSAVE: "item_unsave",
  SHOW_SAVE: "show_save",
  SHOW_UNSAVE: "show_unsave",
  SAVED_SHOP_CLICK: "saved_shop_click",
  CHAT_MESSAGE_SENT: "chat_message_sent",
  POLL_VOTE: "poll_vote",
  REPLAY_SHARE: "replay_share",
  HOST_END_SHOW: "host_end_show",
  HOST_PREP_ANOTHER: "host_prep_another",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null
>;

export function trackEvent(
  event: AnalyticsEventName,
  props?: AnalyticsProps,
) {
  if (process.env.NODE_ENV === "development") return;
  track(event, props);
}
