/** "5분 뒤" 처럼 고령자가 바로 이해할 수 있는 문구 */
export function formatArrivalText(arrTimeSec: number): string {
  if (arrTimeSec <= 60) return '곧 도착';
  const minutes = Math.round(arrTimeSec / 60);
  return `${minutes}분 뒤`;
}
