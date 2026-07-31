// 발표자료용 스크린샷 — 둥근 모서리 유지(투명 PNG), 귀퉁이 사각 잔상 없음
// 실행: node shots.mjs
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://shimpyo-busstop.vercel.app";
const OUT = "C:/Users/hyeon/Desktop/projects/chuncheon-busstop/shots";
const GEO = { latitude: 37.8896, longitude: 127.7422 }; // 동산A 인근 (후평동)
const W = 390, H = 844, RADIUS = 46;

fs.mkdirSync(OUT, { recursive: true });

// 폰 화면 자체를 둥글게 만들고 바깥은 투명으로 — 캡처 시 귀퉁이가 잘려 보이지 않는다
const ROUND_CSS = `
  html { border-radius: ${RADIUS}px; overflow: hidden; background: transparent !important; }
  body { border-radius: ${RADIUS}px; overflow: hidden; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.addStyleTag({ content: ROUND_CSS });
  await sleep(400);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log("saved", name);
}

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(BASE, ["geolocation"]);

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.setGeolocation(GEO);

// 1. 홈 (어디로 가시나요) — 출발지 주소가 채워질 때까지 대기
await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await sleep(3500);
await shot(page, "01-home");

// 2. 도착 장소 검색 팝업 (목록 + 지도 미리보기)
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  btns.find((b) => b.textContent.includes("도착"))?.click();
});
await sleep(800);
await page.keyboard.type("한림대학교", { delay: 60 });
await sleep(2500);
// 첫 결과 탭 → 지도 미리보기 펼침
await page.evaluate(() => {
  const list = document.querySelectorAll(".no-scrollbar button");
  list[0]?.click();
});
await sleep(2500);
await shot(page, "02-search-modal");

// 3. 추천 경로 카드 (실시간 도착)
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  btns.find((b) => b.textContent.trim() === "확인")?.click();
});
await sleep(1200);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  btns.find((b) => b.textContent.trim() === "확인")?.click();
});
await sleep(3000);
await shot(page, "03-recommend");

// 4~6. 실시간 안내 (시연 모드로 이동 단계별)
await page.evaluate(() => {
  const cards = [...document.querySelectorAll("button")];
  cards.find((b) => b.textContent.includes("번") && b.textContent.includes("출발"))?.click();
});
await sleep(4000);
if (!page.url().includes("/route/live")) {
  console.log("live 진입 실패, 현재:", page.url());
} else {
  await shot(page, "04-live");
  await page.goto(page.url() + "?demo=1", { waitUntil: "networkidle2" });
  await sleep(3000);
  await shot(page, "05-live-demo-start");
  // 다음 ▸ 두 번 → 버스 이동 중 카드
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("다음"));
      b?.click();
    });
    await sleep(1200);
  }
  await shot(page, "06-live-riding");
}

// 7. 쉼터 지도
await page.goto(`${BASE}/map`, { waitUntil: "networkidle2" });
await sleep(5000);
await shot(page, "07-shelter-map");

// 8. 민원 첫 화면
await page.goto(`${BASE}/report`, { waitUntil: "networkidle2" });
await sleep(2000);
await shot(page, "08-report");

await browser.close();
console.log("done ->", OUT);
