/**
 * 기준 기기 / 안전영역 규격
 *
 * - 화면: 갤럭시 S24 CSS 뷰포트 360 x 780 (물리 1080 x 2340, DPR 3)
 * - 알림바(status bar): 24dp — AOSP core/res/values/dimens.xml `status_bar_height`
 * - 네비게이션 바: 48dp — AOSP `navigation_bar_height` (3버튼 기준)
 *   제스처 내비게이션 사용 시 24dp
 */
export const FRAME_WIDTH = 360;
export const FRAME_HEIGHT = 780;

export const STATUS_BAR_HEIGHT = 24;
export const NAV_BAR_HEIGHT = 48;
export const GESTURE_BAR_HEIGHT = 24;

export const CONTENT_HEIGHT = FRAME_HEIGHT - STATUS_BAR_HEIGHT - NAV_BAR_HEIGHT;
