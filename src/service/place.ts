import { Redis } from "ioredis";
import {
  extractItemsAndTotal,
  getMainDetail,
  getPlaceList,
  getPlaceType
} from "../api/placeApi.js";
import { log } from "../utils/index.js";


// TTL = 1시간
const TTL = 60 * 60;

export async function place(
  search_keyword: string,
  limit: number,
  startDelay: number,
  endDelay: number,
  redis: Redis
) {
  try {
    if (!search_keyword) {
      throw new Error("등록된 키워드가 존재하지 않습니다.");
    }

    const cacheKey = `place:${search_keyword}:${limit}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const cachedData = JSON.parse(cached);
      // 캐시가 있으면 즉시 응답 (빠름)
      // TTL 만료 여부 확인 후, 만료 시 백그라운드 갱신
      const expired = Date.now() - cachedData.timestamp > (TTL * 1000);
      if (expired) {
        revalidate(search_keyword, limit, startDelay, endDelay, redis, cacheKey);
      }

      console.log(`캐시 사용: ${cacheKey}`);
      return cachedData.data;
    }

    // 캐시에 없으면 데이터 새로 가져오기
    const freshData = await fetchAndBuild(search_keyword, limit, startDelay, endDelay);

    // 캐시에 저장
    if (freshData?.result?.length > 0) {
      await redis.setex(
        cacheKey,
        TTL,
        JSON.stringify({ timestamp: Date.now(), data: freshData })
      );
    }

    return freshData;

  } catch (error: any) {
    console.error("PlaceCrawler 에러:", error);
    return {
      code: "9999",
      type: "alert",
      msg: error.message,
    };
  }
}

/**
 * 실제 데이터 크롤링 & 결과 빌드
 */
export async function fetchAndBuild(
  search_keyword: string,
  limit: number,
  startDelay: number,
  endDelay: number,
) {

  const searchUrl = `https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=${encodeURIComponent(search_keyword)}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'ko',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error('검색 요청중 오류가 발생하였습니다.');
  }

  const html = await response.text();
  let mainDetail: any = await getMainDetail(html);
  if (!mainDetail.input) {
    mainDetail.input = {
      sessionId: '',
      keyword: search_keyword
    };
  }
  let placeType = getPlaceType(mainDetail, 'place');
  const pageUnit = 100;
  let pageMax = Math.min(limit, 300);
  const geo_x = "126.9783882";
  const geo_y = "37.5666103";
  const rdata = [] as Record<string, any>[];

  for (let p = 1; p < pageMax; p += pageUnit) {
    log.placeLog(`가져오기 '${search_keyword}' (${placeType}) 요청 시작 번호 : ${p}`);

    const postResult = await getPlaceList(
      placeType,
      search_keyword,
      p,
      geo_x,
      geo_y,
      mainDetail.input
    );

    const { items, total_cnt } = extractItemsAndTotal(placeType, postResult);

    if (total_cnt < pageMax) {
      pageMax = total_cnt + 1;
    }

    let rank = p;
    for (const item of items) {
      if (rdata.length >= pageMax) {
        break;
      }

      const {
        id,
        gdid,
        name,
        category = "",
        categoryCodeList = "",
        visitorReviewScore = "",
        blogCafeReviewCount,
        visitorReviewCount = item.placeReviewCount || "",
        saveCount = "",
        newOpening = "",
        roadAddress,
        imageUrl,
      } = item;

      rdata.push({
        id,
        gdid,
        name,
        category,
        categoryCodeList,
        visitorReviewScore,
        blogCafeReviewCount,
        visitorReviewCount,
        saveCount,
        newOpening,
        roadAddress,
        imageUrl,
        placeTotalCount: total_cnt.toLocaleString('ko-KR'),
        rank,
      });

      rank++;
    }

    if (p < pageMax - pageUnit) {
      // const delayTime = Math.random() * (endDelay - startDelay) + startDelay;
      // console.log(`처리 대기 : ${(delayTime / 1000).toFixed(2)}초`);
      // await delay(delayTime);
    }
  }

  return {
    code: "0000",
    type: "action",
    result: rdata,
  };
}


/**
 * 백그라운드에서 데이터 갱신
 */
async function revalidate(
  search_keyword: string,
  limit: number,
  startDelay: number,
  endDelay: number,
  redis: Redis,
  cacheKey: string
) {
  fetchAndBuild(search_keyword, limit, startDelay, endDelay)
    .then(async (freshData) => {
      await redis.setex(
        cacheKey,
        TTL,
        JSON.stringify({ timestamp: Date.now(), data: freshData })
      );
      console.log(`캐시 갱신 완료: ${cacheKey}`);
    })
    .catch((err: any) => {
      console.error("revalidate 실패:", err);
    });
}
