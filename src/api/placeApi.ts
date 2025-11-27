import { log } from "../utils/index.js";

/**
 * 플레이스 생성일자.
 */
export function parsePlaceOpen(url: string) {
  if (!url) {
    return "";
  }
  // const decodedUrl = decodeURIComponent(url);
  const parsedUrl = new URL(url);

  if (parsedUrl.host && parsedUrl.pathname) {
    const urlArr = parsedUrl.pathname.substring(1).split("/");
    const openDateArr = urlArr[0].split("_");
    return openDateArr[0];
  }
  return "";
}

/**
 * 공통 fetch 요청 함수.
 */
async function makePlaceRequest(apiUrl: string, postData: string) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'ko',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'origin': 'https://m.place.naver.com',
      'referer': 'https://m.place.naver.com/',
      'pragma': 'no-cache',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'x-ncaptcha-violation': 'true',
      'x-wtm-graphql': 'eyJhcmciOiLqtJHso7zrp5vsp5EiLCJ0eXBlIjoicmVzdGF1cmFudCIsInNvdXJjZSI6InBsYWNlIn0',
      'cookie': 'NNB=BDPYRQIYEITWO; NAC=SIHzBYgLLWXg; nstore_session=dyczshD3AtXBjor7uAQoU0sW; ASID=76df43de000001962a29b08700000057; NFS=2; nstore_pagesession=jtmzZlqWNDzqadsMrnl-346893; PLACE_LANGUAGE=ko; MM_PF=SEARCH; SRT30=1746719191; SRT5=1746719191; page_uid=jtzeHwpr4u8ssLmSkNCssssssIZ-195276; _naver_usersession_=SHxSetOgZ/BRNgxpJ97mug==; BUC=SD3MijRmTEHlzS48TbW0vaWcfN4gc2i8BOr1BhzcD2U='
    },
    body: postData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API 요청 실패:', {
      status: response.status,
      statusText: response.statusText,
      url: apiUrl,
      error: errorText
    });
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  try {
    return await response.json();
  } catch (error: any) {
    log.placeLog(`JSON 파싱 실패: ${error}`, "red");
    throw error;
  }
}

/**
 * 추가 정보 가져오기.
 */
export async function getAdditionInfo(placeId: number) {
  const result = {
    place_score: '',
    placeReviewCount: '',
    reviewCount: '',
    place_keyword: ''
  };

  const postData = `{"query":"query getPlaceDetail($id: String!, $deviceType: String) {\\n  business: placeDetail(input: {id: $id, isNx: false, deviceType: $deviceType}) {\\n    base {\\n      ...PlaceDetailBase\\n    }\\n    fsasReviews {\\n      ...FsasReviews\\n    }\\n    informationTab {\\n      ...CommonInformation\\n    }    \\n    description\\n    martOffInfo\\n    is100YearCertified\\n    is100YearSmallManufacturer\\n    isAntiqueStore\\n    isNFASafetyCertified\\n    newOpening\\n    visitorReviewMediasTotal\\n    isKoreaGrandSale\\n    hasAroundItems\\n  }\\n}\\n\\nfragment PlaceDetailBase on PlaceDetailBase {\\n  id\\n  name\\n  siteId\\n  road\\n  conveniences\\n  category\\n  categoryCode\\n  categoryCodeList\\n  defaultCategoryCodeList\\n  categoryCount\\n  rcode\\n  roadAddress\\n  address\\n  visitorReviewsTotal\\n  visitorReviewsScore\\n  hideBusinessHours\\n  hidePrice\\n  microReviews\\n  paymentInfo\\n  openingHours {\\n    day\\n    isDayOff\\n    schedule {\\n      name\\n      descriptions\\n      isDayOff\\n    }\\n  }\\n  isGoodStore\\n  routeUrl\\n  virtualPhone\\n  phone\\n  hasMobilePhoneNumber\\n  talktalkUrl\\n  chatBotUrl\\n  naverBlog {\\n    id\\n    categoryNo\\n  }\\n  visitorReviewsTextReviewTotal\\n}\\n\\nfragment FsasReviews on FsasReviewsResult {\\n  total\\n}\\n\\nfragment CommonInformation on InformationTab {\\n  parkingInfo {\\n    description\\n    basicParking {\\n      isFree\\n      normalFeeDescription\\n      extraFeeDescription\\n    }\\n    valetParking {\\n      isFree\\n      valetFeeDescription\\n    }\\n  }\\n  facilities {\\n    id\\n    name\\n    i18nName\\n  }\\n  keywordList\\n}","variables":{"id":"${placeId}","deviceType":"pc"}}`;

  const placeDetail: any = await makePlaceRequest('https://api.place.naver.com/graphql', postData);

  if (!placeDetail) {
    throw new Error("추가 정보 가져오는 요청 실패");
  }

  // 플레이스 리뷰 점수
  if (placeDetail.data?.business?.base?.visitorReviewsScore) {
    result.place_score = placeDetail.data.business.base.visitorReviewsScore;
  }

  // 방문자 수
  if (placeDetail.data?.business?.base?.visitorReviewsTotal) {
    result.placeReviewCount = placeDetail.data.business.base.visitorReviewsTotal;
  }

  // 블로그 수
  if (placeDetail.data?.business?.fsasReviews?.total) {
    result.reviewCount = placeDetail.data.business.fsasReviews.total;
  }

  // 플레이스 키워드
  if (placeDetail.data?.business?.informationTab?.keywordList) {
    result.place_keyword = placeDetail.data.business.informationTab.keywordList.join(', ');
  }

  return result;
}

/**
 * 플레이스 타입 조회.
 *
 * @param mainDetail
 * @param api_place_type
 * @returns
 */
export function getPlaceType(mainDetail: any, api_place_type: string) {
  let placeType = 'place';
  switch (mainDetail.queryType) {
    case 'attractions':
    case 'attraction':
      placeType = 'attraction';
      break;
    case 'nailshopList':
    case 'nailshop':
      placeType = 'nailshop';
      break;
    case 'hairshopList':
    case 'hairshop':
      placeType = 'hairshop';
      break;
    case 'hospitals':
    case 'hospital':
      placeType = 'hospital';
      break;
    case 'accommodationSearch':
    case 'accommodation':
      // 숙박은 페이지 2영역이 있어서, api 요청타입이 숙박이어야만 숙박으로 처리
      if (api_place_type === 'accommodation') {
        placeType = 'accommodation';
      }
      break;
    case 'restaurantList':
    case 'restaurant':
      placeType = 'restaurant';
      break;
    case 'trips':
    case 'trip':
      placeType = 'trip';
      break;
    case 'inspections':
    case 'motor':
      placeType = 'motor';
      break;
    default:
      placeType = 'place';
      break;
  }
  return placeType;
}

/**
 * 메인 플레이스 목록 가져오기.
 *
 * @param page
 * @returns
 */
export async function getMainPlaceList(html: string) {
  try {
    const match = html.match(/__APOLLO_STATE__ = (\{.+?\});\n/);

    if (!match) return [];

    const apolloState = JSON.parse(match[1]);

    const result = [];
    for (const key in apolloState) {
      const value = apolloState[key];
      if (!value) continue;

      const matchKey = key.match(/[a-zA-Z]+?(Summary|ListItem):[0-9]+/);
      if (matchKey && !value.adId) {
        result.push(value);
      }
    }

    return result;
  } catch (e: any) {
    log.placeLog(`getMainPlaceList error: ${e}`, "red");
    return [];
  }
}

/**
 * 검색페이지를 분석해서 상세 정보 가져오기.
 *
 * @param html
 * @returns
 */
export async function getMainDetail(html: string) {
  try {
    const apolloStateMatch = html.match(/naver\.search\.ext\.(?:nmb|loc)\.salt\.__APOLLO_STATE__ = (.+);/);

    if (!apolloStateMatch) {
      return { queryType: 'place', total: null, input: null };
    }

    let apolloState = JSON.parse(apolloStateMatch[1]).ROOT_QUERY;

    const akeys = Object.keys(apolloState);
    if (!akeys[1].includes('{')) { // 한번 감싼 형태 대응(motor)
      const lastKey = akeys[1];
      const lastValue = apolloState[lastKey];
      if (lastValue && typeof lastValue === 'object') {
        apolloState = lastValue;
      }
    }

    let result = {};

    for (const key in apolloState) {
      const match = key.match(/^(.+?)\({"input":(.+?)}\)/);
      if (match) {
        const queryType = match[1];
        const parsed = JSON.parse(match[2].replace(/,\"isNx\":true/, ''));

        // 바로 상세로 간 경우
        if (queryType === 'placeDetail') {
          const nluMatch = html.match(/naver\.search\.ext\.(?:nmb|loc)\.salt\.nlu = '(.+)';/);
          if (nluMatch) {
            const nluParsed = JSON.parse(nluMatch[1]);
            const placeDetailBase = JSON.parse(apolloStateMatch[1])[`PlaceDetailBase:${nluParsed.queryResult.bizId}`];
            // console.log(placeDetailBase);

            return {
              queryType: nluParsed.queryType,
              placeData: {
                id: placeDetailBase.id,
                gdid: "",
                name: placeDetailBase.name,
                category: placeDetailBase.category,
                categoryCodeList: placeDetailBase.categoryCodeList,
                visitorReviewScore: placeDetailBase.visitorReviewsScore,
                blogCafeReviewCount: "",
                visitorReviewCount: placeDetailBase.visitorReviewsTotal,
                saveCount: "",
                newOpening: "",
                roadAddress: placeDetailBase.roadAddress,
                imageUrl: "",
              },
              total: 1,
              input: null
             };
          }
        }

        if (parsed.nlu) {
          const nlu = JSON.parse(parsed.nlu);
          parsed.keyword = nlu.queryResult.keyword;
          parsed.sessionId = nlu.queryResult?.sessionId;
          parsed.department = nlu.queryResult?.department;
        } else {
          if (!parsed.keyword) {
            parsed.keyword = parsed.query;
          }
        }

        let total = apolloState[key]?.total;
        if (!total) {
          for (const skey in apolloState[key]) {
            if (skey.startsWith('business')) {
              total = apolloState[key][skey].total;
              break;
            }
          }
        }

        if (parsed && !queryType.startsWith('ad')) {
          result = { queryType, total, input: parsed };
          break;
        }
      }
    }
    return result;
  } catch (e: any) {
    log.placeLog(`HTML 파싱 중 오류 발생: ${e}`, "red")
    return { queryType: 'place', total: null, input: null };
  }
}

/**
 * 데이터 가져오기.
 */
export async function getPlaceList(
  placeType: string,
  keyword: string,
  start: number,
  geo_x: string,
  geo_y: string,
  input: any
) {
  let postData;
  let apiUrl = "https://api.place.naver.com/graphql";
  switch (placeType) {
    case "restaurant":
      postData = getPostDataRestaurant(keyword, start, geo_x, geo_y);
      break;
    case "accommodation":
      postData = getPostDataAccommodation(keyword, start, geo_x, geo_y);
      break;
    case "trip":
      apiUrl = "https://trip-api.place.naver.com/graphql";
      postData = getPostDataTrip(keyword, start, geo_x, geo_y);
      break;
    case "hairshop":
      postData = getPostDataHairshop(keyword, start, geo_x, geo_y);
      break;
    case "nailshop":
      postData = getPostDataNailshop(keyword, start, geo_x, geo_y);
      break;
    case "attraction":
      postData = getPostDataAttraction(keyword, start, geo_x, geo_y, input);
      break;
    case "hospital":
      postData = getPostDataHospital(keyword, start, geo_x, geo_y, input);
      break;
    case 'motor':
      postData = getPostDataInspection(keyword, start, geo_x, geo_y);
      break;
    default:
      postData = getPostDataDefault(keyword, start, geo_x, geo_y, input?.sessionId);
  }

  // 최대 3번까지 요청 시도
  let maxRetries = 1;
  let retryCount = 0;
  let result: any;

  while (retryCount < maxRetries) {
    try {
      result = await makePlaceRequest(apiUrl, postData);

      // 결과가 있는지, items 배열이 비어있는지 확인
      const hasItems = checkResultHasItems(placeType, result);

      if (result && !result.error && hasItems) {
        // 성공적인 결과를 얻었으면 재시도 루프 종료
        break;
      } else {
        retryCount++;
        log.placeLog(`${placeType} , '${keyword}' 검색 ${retryCount}번째 재시도 중 (items가 없거나 오류 발생): ${result?.error || 'items 데이터 없음'}`, "red");

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
        }
      }
    } catch (error: any) {
      retryCount++;
      log.placeLog(`${retryCount}번째 POST 요청 실행 중 오류: ${error}`, "red");

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      }
    }
  }

  if (retryCount === maxRetries) {
    log.placeLog(`최대 재시도 횟수(${maxRetries})에 도달했습니다.`, "red");
  }

  return result;
}

/**
 * 결과에 items가 있는지 검사
 */
function checkResultHasItems(placeType: string, result: any) {
  if (!result || Array.isArray(result) && result[0]?.error) {
    return false;
  }

  try {
    const { items } = extractItemsAndTotal(placeType, result);
    return items && items.length > 0;
  } catch (e: any) {
    log.placeLog(`결과 항목 확인 중 오류: ${e}`, "red");
    return false;
  }
}

/**
 * API 응답에서 아이템과 총 개수를 추출합니다.
 */
export function extractItemsAndTotal(placeType: string, postResult: any) {
  let items: any[] = [];
  let total_cnt: number = 0;

  if (placeType === 'restaurant') {
    items = postResult[0]?.data?.restaurants?.items;
    total_cnt = postResult[0]?.data?.restaurants?.total;
  } else if (placeType === 'attraction') {
    items = postResult[0]?.data?.attractions?.businesses?.items;
    total_cnt = postResult[0]?.data?.attractions?.businesses?.total;
  } else if (placeType === 'accommodation') {
    items = postResult[0]?.data?.accommodationSearch?.business?.items;
    total_cnt = postResult[0]?.data?.accommodationSearch?.business?.total;
  } else if (placeType === 'trip') {
    items = postResult[0]?.data?.trips?.items;
    total_cnt = postResult[0]?.data?.trips?.total;
  } else if (placeType === 'motor') {
    items = postResult[0]?.data?.motorInspection?.businesses.items;
    total_cnt = postResult[0]?.data?.motorInspection?.businesses.total;
  } else {
    items = postResult[0]?.data?.businesses?.items;
    total_cnt = postResult[0]?.data?.businesses?.total;
  }

  return { items, total_cnt };
}

/**
 * 레스토랑.
 */
function getPostDataRestaurant(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{"operationName":"getRestaurantList","variables":{"restaurantListInput":{"query":"${keyword}","x":"${geo_x}","y":"${geo_y}","start":${start},"display":100,"takeout":null,"orderBenefit":null,"filterOpening":null,"isNmap":false,"deviceType":"pc"},"restaurantListFilterInput":{"x":"${geo_x}","y":"${geo_y}","query":"${keyword}","display":1,"start":${start},"isCurrentLocationSearch":null},"isNmap":false,"isBounds":false},"query":"query getRestaurantList($restaurantListInput: RestaurantListInput, $restaurantListFilterInput: RestaurantListFilterInput, $isNmap: Boolean!, $isBounds: Boolean!) {\\n  restaurants: restaurantList(input: $restaurantListInput) {\\n    items {\\n      apolloCacheId\\n      coupon {\\n        ...CouponItems\\n        __typename\\n      }\\n      ...CommonBusinessItems\\n      ...RestaurantBusinessItems\\n      __typename\\n    }\\n    ...RestaurantCommonFields\\n    nlu {\\n      ...NluFields\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      __typename\\n    }\\n    searchGuide @include(if: $isNmap) {\\n      ...SearchGuide\\n      __typename\\n    }\\n    __typename\\n  }\\n  filters: restaurantListFilter(input: $restaurantListFilterInput) {\\n    ...RestaurantFilter\\n    __typename\\n  }\\n}\\n\\nfragment CommonBusinessItems on BusinessSummary {\\n  id\\n  dbType\\n  name\\n  businessCategory\\n  category\\n  description\\n  hasBooking\\n  hasNPay\\n  x\\n  y\\n  distance\\n  imageUrl\\n  imageCount\\n  phone\\n  virtualPhone\\n  routeUrl\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  roadAddress\\n  address\\n  commonAddress\\n  blogCafeReviewCount\\n  bookingReviewCount\\n  totalReviewCount\\n  bookingUrl\\n  bookingBusinessId\\n  talktalkUrl\\n  detailCid {\\n    c0\\n    c1\\n    c2\\n    c3\\n    __typename\\n  }\\n  options\\n  promotionTitle\\n  agencyId\\n  businessHours\\n  newOpening\\n  markerId @include(if: $isNmap)\\n  markerLabel @include(if: $isNmap) {\\n    text\\n    style\\n    __typename\\n  }\\n  imageMarker @include(if: $isNmap) {\\n    marker\\n    markerSelected\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment NluFields on Nlu {\\n  queryType\\n  user {\\n    gender\\n    __typename\\n  }\\n  queryResult {\\n    ptn0\\n    ptn1\\n    region\\n    spot\\n    tradeName\\n    service\\n    selectedRegion {\\n      name\\n      index\\n      x\\n      y\\n      __typename\\n    }\\n    selectedRegionIndex\\n    otherRegions {\\n      name\\n      index\\n      __typename\\n    }\\n    property\\n    keyword\\n    queryType\\n    nluQuery\\n    businessType\\n    cid\\n    branch\\n    forYou\\n    franchise\\n    titleKeyword\\n    location {\\n      x\\n      y\\n      default\\n      longitude\\n      latitude\\n      dong\\n      si\\n      __typename\\n    }\\n    noRegionQuery\\n    priority\\n    showLocationBarFlag\\n    themeId\\n    filterBooking\\n    repRegion\\n    repSpot\\n    dbQuery {\\n      isDefault\\n      name\\n      type\\n      getType\\n      useFilter\\n      hasComponents\\n      __typename\\n    }\\n    type\\n    category\\n    menu\\n    context\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment SearchGuide on SearchGuide {\\n  queryResults {\\n    regions {\\n      displayTitle\\n      query\\n      region {\\n        rcode\\n        __typename\\n      }\\n      __typename\\n    }\\n    isBusinessName\\n    __typename\\n  }\\n  queryIndex\\n  types\\n  __typename\\n}\\n\\nfragment CouponItems on Coupon {\\n  total\\n  promotions {\\n    promotionSeq\\n    couponSeq\\n    conditionType\\n    image {\\n      url\\n      __typename\\n    }\\n    title\\n    description\\n    type\\n    couponUseType\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment RestaurantFilter on RestaurantListFilterResult {\\n  filters {\\n    index\\n    name\\n    value\\n    multiSelectable\\n    defaultParams {\\n      age\\n      gender\\n      day\\n      time\\n      __typename\\n    }\\n    items {\\n      index\\n      name\\n      value\\n      selected\\n      representative\\n      displayName\\n      clickCode\\n      laimCode\\n      type\\n      icon\\n      __typename\\n    }\\n    __typename\\n  }\\n  votingKeywordList {\\n    items {\\n      name\\n      value\\n      icon\\n      clickCode\\n      __typename\\n    }\\n    menuItems {\\n      name\\n      value\\n      icon\\n      clickCode\\n      __typename\\n    }\\n    total\\n    __typename\\n  }\\n  optionKeywordList {\\n    items {\\n      name\\n      value\\n      icon\\n      clickCode\\n      __typename\\n    }\\n    total\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment RestaurantCommonFields on RestaurantListResult {\\n  restaurantCategory\\n  queryString\\n  siteSort\\n  selectedFilter {\\n    order\\n    rank\\n    tvProgram\\n    region\\n    brand\\n    menu\\n    food\\n    mood\\n    purpose\\n    sortingOrder\\n    takeout\\n    orderBenefit\\n    cafeFood\\n    day\\n    time\\n    age\\n    gender\\n    myPreference\\n    hasMyPreference\\n    cafeMenu\\n    cafeTheme\\n    theme\\n    voting\\n    filterOpening\\n    keywordFilter\\n    property\\n    realTimeBooking\\n    hours\\n    __typename\\n  }\\n  rcodes\\n  location {\\n    sasX\\n    sasY\\n    __typename\\n  }\\n  total\\n  __typename\\n}\\n\\nfragment RestaurantBusinessItems on RestaurantListSummary {\\n  categoryCodeList\\n  visitorReviewCount\\n  visitorReviewScore\\n  imageUrls\\n  bookingHubUrl\\n  bookingHubButtonName\\n  visitorImages {\\n    id\\n    reviewId\\n    imageUrl\\n    profileImageUrl\\n    nickname\\n    __typename\\n  }\\n  visitorReviews {\\n    id\\n    review\\n    reviewId\\n    __typename\\n  }\\n  foryouLabel\\n  foryouTasteType\\n  microReview\\n  tags\\n  priceCategory\\n  broadcastInfo {\\n    program\\n    date\\n    menu\\n    __typename\\n  }\\n  michelinGuide {\\n    year\\n    star\\n    comment\\n    url\\n    hasGrade\\n    isBib\\n    alternateText\\n    hasExtraNew\\n    region\\n    __typename\\n  }\\n  broadcasts {\\n    program\\n    menu\\n    episode\\n    broadcast_date\\n    __typename\\n  }\\n  tvcastId\\n  naverBookingCategory\\n  saveCount\\n  uniqueBroadcasts\\n  isDelivery\\n  deliveryArea\\n  isCvsDelivery\\n  isTableOrder\\n  isPreOrder\\n  isTakeOut\\n  bookingDisplayName\\n  bookingVisitId\\n  bookingPickupId\\n  popularMenuImages {\\n    name\\n    price\\n    bookingCount\\n    menuUrl\\n    menuListUrl\\n    imageUrl\\n    isPopular\\n    usePanoramaImage\\n    __typename\\n  }\\n  newBusinessHours {\\n    status\\n    description\\n    __typename\\n  }\\n  baemin {\\n    businessHours {\\n      deliveryTime {\\n        start\\n        end\\n        __typename\\n      }\\n      closeDate {\\n        start\\n        end\\n        __typename\\n      }\\n      temporaryCloseDate {\\n        start\\n        end\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  yogiyo {\\n    businessHours {\\n      actualDeliveryTime {\\n        start\\n        end\\n        __typename\\n      }\\n      bizHours {\\n        start\\n        end\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  realTimeBookingInfo {\\n    description\\n    hasMultipleBookingItems\\n    bookingBusinessId\\n    bookingUrl\\n    itemId\\n    itemName\\n    timeSlots {\\n      date\\n      time\\n      timeRaw\\n      available\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}"}]`;
}

/**
 * 숙박.
 */
function getPostDataAccommodation(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{"operationName":"searchAccommodation","variables":{"input":{"query":"${keyword}","display":100,"start":${start},"x":"${geo_x}","y":"${geo_y}","sortingOrder":"precision","deviceType":"pc","minPrice":null,"maxPrice":null,"pay":"true","npay":"true"},"isNmap":false,"isBounds":false},"query":"query searchAccommodation($input: AccommodationSearchInput, $isNmap: Boolean!, $isBounds: Boolean!) {\\n  accommodationSearch(input: $input) {\\n    business {\\n      total\\n      items {\\n        ...CommonBusinessItems\\n        ...AccommodationBusinessItems\\n        apolloCacheId\\n        categoryCode\\n        bookingReviewScore\\n        coupon {\\n          ...CouponItems\\n          __typename\\n        }\\n        __typename\\n      }\\n      nlu {\\n        ...AccommodationNlu\\n        __typename\\n      }\\n      queryString\\n      siteSort\\n      optionsForMap @include(if: $isBounds) {\\n        ...OptionsForMap\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment CommonBusinessItems on BusinessSummary {\\n  id\\n  dbType\\n  name\\n  businessCategory\\n  category\\n  description\\n  hasBooking\\n  hasNPay\\n  x\\n  y\\n  distance\\n  imageUrl\\n  imageCount\\n  phone\\n  virtualPhone\\n  routeUrl\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  roadAddress\\n  address\\n  commonAddress\\n  blogCafeReviewCount\\n  bookingReviewCount\\n  totalReviewCount\\n  bookingUrl\\n  bookingBusinessId\\n  talktalkUrl\\n  detailCid {\\n    c0\\n    c1\\n    c2\\n    c3\\n    __typename\\n  }\\n  options\\n  promotionTitle\\n  agencyId\\n  businessHours\\n  newOpening\\n  markerId @include(if: $isNmap)\\n  markerLabel @include(if: $isNmap) {\\n    text\\n    style\\n    __typename\\n  }\\n  imageMarker @include(if: $isNmap) {\\n    marker\\n    markerSelected\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment CouponItems on Coupon {\\n  total\\n  promotions {\\n    promotionSeq\\n    couponSeq\\n    conditionType\\n    image {\\n      url\\n      __typename\\n    }\\n    title\\n    description\\n    type\\n    couponUseType\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment AccommodationBusinessItems on AccommodationSearchItem {\\n  imageUrls\\n  microReview\\n  placeReviewCount\\n  placeReviewScore\\n  roomImages {\\n    id\\n    name\\n    imageUrl\\n    minPrice\\n    maxPrice\\n    avgPrice\\n    __typename\\n  }\\n  visitorImages {\\n    id\\n    reviewId\\n    imageUrl\\n    profileImageUrl\\n    nickname\\n    __typename\\n  }\\n  visitorReviews {\\n    id\\n    reviewId\\n    review\\n    __typename\\n  }\\n  matchRoomMinPrice\\n  avgPrice\\n  interiorPanorama\\n  matchSidRoomIds\\n  bookingUserCount\\n  facility\\n  coupon {\\n    total\\n    promotions {\\n      promotionSeq\\n      couponSeq\\n      conditionType\\n      image {\\n        url\\n        __typename\\n      }\\n      title\\n      description\\n      type\\n      couponUseType\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment AccommodationNlu on Nlu {\\n  queryType\\n  queryResult {\\n    q\\n    theme\\n    ptn0\\n    ptn1\\n    region\\n    spot\\n    tradeName\\n    service\\n    selectedRegion {\\n      name\\n      index\\n      x\\n      y\\n      __typename\\n    }\\n    selectedRegionIndex\\n    otherRegions {\\n      name\\n      index\\n      __typename\\n    }\\n    property\\n    keyword\\n    queryType\\n    location {\\n      x\\n      y\\n      default\\n      longitude\\n      latitude\\n      dong\\n      si\\n      __typename\\n    }\\n    noRegionQuery\\n    priority\\n    showLocationBarFlag\\n    themeId\\n    filterBooking\\n    dbQuery {\\n      isDefault\\n      name\\n      type\\n      getType\\n      useFilter\\n      hasComponents\\n      __typename\\n    }\\n    type\\n    __typename\\n  }\\n  __typename\\n}"}]`;
}

/**
 * 헤어샵.
 */
function getPostDataHairshop(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{"operationName":"getBeautyList","variables":{"useReverseGeocode":false,"input":{"query":"${keyword}","display":100,"start":${start},"filterBooking":false,"filterCoupon":false,"filterNpay":false,"filterOpening":false,"filterBookingPromotion":false,"naverBenefit":false,"sortingOrder":"precision","x":"${geo_x}","y":"${geo_y}","deviceType":"pc","bypassStyleClous":false},"businessType":"hairshop","isNmap":false,"isBounds":false},"query":"query getBeautyList($input: BeautyListInput, $businessType: String, $isNmap: Boolean\u0021, $isBounds: Boolean\u0021, $reverseGeocodingInput: ReverseGeocodingInput, $useReverseGeocode: Boolean = false) {\\n  businesses: hairshopList(input: $input) {\\n    total\\n    userGender\\n    items {\\n      ...BeautyBusinessItems\\n      imageMarker @include(if: $isNmap) {\\n        marker\\n        markerSelected\\n        __typename\\n      }\\n      markerId @include(if: $isNmap)\\n      markerLabel @include(if: $isNmap) {\\n        text\\n        style\\n        __typename\\n      }\\n      __typename\\n    }\\n    nlu {\\n      ...NluFields\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      __typename\\n    }\\n    styleFilters {\\n      id\\n      name\\n      category\\n      count\\n      __typename\\n    }\\n    queryString\\n    siteSort\\n    __typename\\n  }\\n  brands: beautyBrands(input: $input, businessType: $businessType) {\\n    name\\n    cid\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment NluFields on Nlu {\\n  queryType\\n  user {\\n    gender\\n    __typename\\n  }\\n  queryResult {\\n    ptn0\\n    ptn1\\n    region\\n    spot\\n    tradeName\\n    service\\n    selectedRegion {\\n      name\\n      index\\n      x\\n      y\\n      __typename\\n    }\\n    selectedRegionIndex\\n    otherRegions {\\n      name\\n      index\\n      __typename\\n    }\\n    property\\n    keyword\\n    queryType\\n    nluQuery\\n    businessType\\n    cid\\n    branch\\n    forYou\\n    franchise\\n    titleKeyword\\n    location {\\n      x\\n      y\\n      default\\n      longitude\\n      latitude\\n      dong\\n      si\\n      __typename\\n    }\\n    noRegionQuery\\n    priority\\n    showLocationBarFlag\\n    themeId\\n    filterBooking\\n    repRegion\\n    repSpot\\n    dbQuery {\\n      isDefault\\n      name\\n      type\\n      getType\\n      useFilter\\n      hasComponents\\n      __typename\\n    }\\n    type\\n    category\\n    menu\\n    context\\n    styles {\\n      id\\n      text\\n      __typename\\n    }\\n    gender\\n    themes\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment CouponItems on Coupon {\\n  total\\n  promotions {\\n    promotionSeq\\n    couponSeq\\n    conditionType\\n    image {\\n      url\\n      __typename\\n    }\\n    title\\n    description\\n    type\\n    couponUseType\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment BeautyBusinessItemBase on BeautySummary {\\n  id\\n  apolloCacheId\\n  name\\n  category\\n  hasBooking\\n  hasNPay\\n  blogCafeReviewCount\\n  bookingReviewCount\\n  bookingReviewScore\\n  description\\n  roadAddress\\n  address\\n  imageUrl\\n  talktalkUrl\\n  distance\\n  x\\n  y\\n  representativePrice {\\n    isFiltered\\n    priceName\\n    price\\n    __typename\\n  }\\n  promotionTitle\\n  stylesCount\\n  visitorReviewCount\\n  visitorReviewScore\\n  styleBookingCounts {\\n    styleNum\\n    name\\n    count\\n    isPopular\\n    __typename\\n  }\\n  newOpening\\n  coupon {\\n    ...CouponItems\\n    __typename\\n  }\\n  styleImages {\\n    id\\n    styleNum\\n    isPopular\\n    imageUrl\\n    title\\n    optIds\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment BeautyBusinessItems on BeautySummary {\\n  ...BeautyBusinessItemBase\\n  styles {\\n    desc\\n    shortDesc\\n    styleNum\\n    isPopular\\n    images {\\n      imageUrl\\n      __typename\\n    }\\n    styleOptions {\\n      num\\n      __typename\\n    }\\n    __typename\\n  }\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  visitorReviews {\\n    id\\n    reviewId\\n    review\\n    __typename\\n  }\\n  __typename\\n}"}]`;
}

/**
 * 네일샵.
 */
function getPostDataNailshop(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{"operationName":"getBeautyList","variables":{"useReverseGeocode":false,"input":{"query":"${keyword}","display":100,"start":${start},"filterBooking":false,"filterCoupon":false,"filterNpay":false,"filterOpening":false,"filterBookingPromotion":false,"naverBenefit":false,"sortingOrder":"precision","x":"${geo_x}","y":"${geo_y}","deviceType":"pc","bypassStyleClous":false},"businessType":"nailshop","isNmap":false,"isBounds":false},"query":"query getBeautyList($input: BeautyListInput, $businessType: String, $isNmap: Boolean\u0021, $isBounds: Boolean\u0021, $reverseGeocodingInput: ReverseGeocodingInput, $useReverseGeocode: Boolean = false) {\\n  businesses: nailshopList(input: $input) {\\n    total\\n    userGender\\n    items {\\n      ...BeautyBusinessItems\\n      imageMarker @include(if: $isNmap) {\\n        marker\\n        markerSelected\\n        __typename\\n      }\\n      markerId @include(if: $isNmap)\\n      markerLabel @include(if: $isNmap) {\\n        text\\n        style\\n        __typename\\n      }\\n      __typename\\n    }\\n    nlu {\\n      ...NluFields\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      __typename\\n    }\\n    styleFilters {\\n      id\\n      name\\n      category\\n      count\\n      __typename\\n    }\\n    queryString\\n    siteSort\\n    __typename\\n  }\\n  brands: beautyBrands(input: $input, businessType: $businessType) {\\n    name\\n    cid\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment NluFields on Nlu {\\n  queryType\\n  user {\\n    gender\\n    __typename\\n  }\\n  queryResult {\\n    ptn0\\n    ptn1\\n    region\\n    spot\\n    tradeName\\n    service\\n    selectedRegion {\\n      name\\n      index\\n      x\\n      y\\n      __typename\\n    }\\n    selectedRegionIndex\\n    otherRegions {\\n      name\\n      index\\n      __typename\\n    }\\n    property\\n    keyword\\n    queryType\\n    nluQuery\\n    businessType\\n    cid\\n    branch\\n    forYou\\n    franchise\\n    titleKeyword\\n    location {\\n      x\\n      y\\n      default\\n      longitude\\n      latitude\\n      dong\\n      si\\n      __typename\\n    }\\n    noRegionQuery\\n    priority\\n    showLocationBarFlag\\n    themeId\\n    filterBooking\\n    repRegion\\n    repSpot\\n    dbQuery {\\n      isDefault\\n      name\\n      type\\n      getType\\n      useFilter\\n      hasComponents\\n      __typename\\n    }\\n    type\\n    category\\n    menu\\n    context\\n    styles {\\n      id\\n      text\\n      __typename\\n    }\\n    gender\\n    themes\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment CouponItems on Coupon {\\n  total\\n  promotions {\\n    promotionSeq\\n    couponSeq\\n    conditionType\\n    image {\\n      url\\n      __typename\\n    }\\n    title\\n    description\\n    type\\n    couponUseType\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment BeautyBusinessItemBase on BeautySummary {\\n  id\\n  apolloCacheId\\n  name\\n  category\\n  hasBooking\\n  hasNPay\\n  blogCafeReviewCount\\n  bookingReviewCount\\n  bookingReviewScore\\n  description\\n  roadAddress\\n  address\\n  imageUrl\\n  talktalkUrl\\n  distance\\n  x\\n  y\\n  representativePrice {\\n    isFiltered\\n    priceName\\n    price\\n    __typename\\n  }\\n  promotionTitle\\n  stylesCount\\n  visitorReviewCount\\n  visitorReviewScore\\n  styleBookingCounts {\\n    styleNum\\n    name\\n    count\\n    isPopular\\n    __typename\\n  }\\n  newOpening\\n  coupon {\\n    ...CouponItems\\n    __typename\\n  }\\n  styleImages {\\n    id\\n    styleNum\\n    isPopular\\n    imageUrl\\n    title\\n    optIds\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment BeautyBusinessItems on BeautySummary {\\n  ...BeautyBusinessItemBase\\n  styles {\\n    desc\\n    shortDesc\\n    styleNum\\n    isPopular\\n    images {\\n      imageUrl\\n      __typename\\n    }\\n    styleOptions {\\n      num\\n      __typename\\n    }\\n    __typename\\n  }\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  visitorReviews {\\n    id\\n    reviewId\\n    review\\n    __typename\\n  }\\n  __typename\\n}"}]`;
}

/**
 * 병원.
 */
function getPostDataHospital(keyword: string, start: number, geo_x: string, geo_y: string, input: any) {
  return `[{"operationName":"getNxList","variables":{"isNmap":false,"isBounds":false,"useReverseGeocode":false,"input":{"query":"${keyword}","display":100,"start":${start},"filterBooking":false,"filterOpentime":false,"filterSpecialist":false,"sortingOrder":"precision","x":"${geo_x}","y":"${geo_y}","day":null,"department":"${input.department ?? ''}","sessionId":"${input.sessionId ?? ''}","deviceType":"pc"}},"query":"query getNxList($input: HospitalListInput, $reverseGeocodingInput: ReverseGeocodingInput, $isNmap: Boolean = false, $isBounds: Boolean = false, $useReverseGeocode: Boolean = false) {\\n  businesses: hospitals(input: $input) {\\n    total\\n    items {\\n      ...HospitalItemFields\\n      __typename\\n    }\\n    nlu {\\n      ...HospitalNluFields\\n      __typename\\n    }\\n    searchGuide {\\n      queryResults {\\n        regions {\\n          displayTitle\\n          query\\n          region {\\n            name\\n            rcode\\n            __typename\\n          }\\n          __typename\\n        }\\n        isBusinessName\\n        __typename\\n      }\\n      queryIndex\\n      types\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      __typename\\n    }\\n    queryString\\n    siteSort\\n    examinationFilters {\\n      name\\n      count\\n      __typename\\n    }\\n    isCacheForced\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment HospitalItemFields on HospitalSummary {\\n  id\\n  name\\n  hasBooking\\n  bookingUrl\\n  hasNPay\\n  blogCafeReviewCount\\n  bookingReviewCount\\n  visitorReviewCount\\n  visitorReviewScore\\n  description\\n  commonAddress\\n  roadAddress\\n  address\\n  fullAddress\\n  imageCount\\n  distance\\n  category\\n  imageUrl\\n  talktalkUrl\\n  promotionTitle\\n  businessHours\\n  x\\n  y\\n  businessCategory\\n  markerId @include(if: $isNmap)\\n  markerLabel @include(if: $isNmap) {\\n    text\\n    style\\n    __typename\\n  }\\n  imageMarker @include(if: $isNmap) {\\n    marker\\n    markerSelected\\n    __typename\\n  }\\n  detailCid {\\n    c0\\n    c1\\n    c2\\n    c3\\n    __typename\\n  }\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  newBusinessHours {\\n    status\\n    description\\n    __typename\\n  }\\n  apolloCacheId\\n  hiraSpecialists {\\n    name\\n    count\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment HospitalNluFields on Nlu {\\n  queryType\\n  queryResult {\\n    ptn0\\n    ptn1\\n    region\\n    spot\\n    tradeName\\n    service\\n    selectedRegion {\\n      name\\n      index\\n      x\\n      y\\n      __typename\\n    }\\n    selectedRegionIndex\\n    otherRegions {\\n      name\\n      index\\n      __typename\\n    }\\n    property\\n    keyword\\n    queryType\\n    location {\\n      x\\n      y\\n      default\\n      longitude\\n      latitude\\n      dong\\n      si\\n      __typename\\n    }\\n    noRegionQuery\\n    priority\\n    showLocationBarFlag\\n    themeId\\n    filterBooking\\n    dbQuery {\\n      isDefault\\n      name\\n      type\\n      getType\\n      useFilter\\n      hasComponents\\n      __typename\\n    }\\n    hospitalQuery\\n    department\\n    disease\\n    repRegion\\n    repSpot\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}"}]`;
}

/**
 * 관광지, 명소.
 */
function getPostDataAttraction(keyword: string, start: number, geo_x: string, geo_y: string, input: any) {
  const region = input.keyword.indexOf(' ') ? input.keyword.split(' ')[0] : '';
  return `[{"operationName":"attractionList","variables":{"useReverseGeocode":false,"isFetchMore":false,"input":{"query":"${keyword}","keyword":"${input.keyword}","categories":${input.categories ? JSON.stringify(input.categories) : ''},"region":"${region ?? ''}","isBrandList":null,"filterBooking":false,"hasNearQuery":null,"listType":"","theme":null,"type":"${input.type ?? ''}","context":"${input.context ?? ''}"},"businessesInput":{"start":${start},"display":100,"deviceType":"mobile","x":"${geo_x}","y":"${geo_y}","sortingOrder":"trendy","sessionId":"${input.sessionId ?? ''}"},"isNmap":false,"isBounds":false,"reverseGeocodingInput":null},"query":"query attractionList($input: AttractionsInput, $businessesInput: AttractionsBusinessesInput, $isNmap: Boolean!, $isBounds: Boolean!, $reverseGeocodingInput: ReverseGeocodingInput, $useReverseGeocode: Boolean = false, $isFetchMore: Boolean = false) {\\n  attractions(input: $input) {\\n    businesses(input: $businessesInput) {\\n      total\\n      items {\\n        id\\n        name\\n        dbType\\n        phone\\n        virtualPhone\\n        hasBooking\\n        hasNPay\\n        visitorReviewCount\\n        blogCafeReviewCount\\n        bookingReviewCount\\n        description\\n        distance\\n        commonAddress\\n        roadAddress\\n        address\\n        imageUrl\\n        imageCount\\n        talktalkUrl\\n        distance\\n        promotionTitle\\n        category\\n        routeUrl\\n        x\\n        y\\n        streetPanorama {\\n          id\\n          pan\\n          tilt\\n          lat\\n          lon\\n          __typename\\n        }\\n        blogImages {\\n          thumbnailUrl\\n          gdid\\n          profileImageUrl\\n          authorName\\n          authorId\\n          __typename\\n        }\\n        visitorImages {\\n          id\\n          reviewId\\n          imageUrl\\n          profileImageUrl\\n          nickname\\n          __typename\\n        }\\n        visitorReviews {\\n          id\\n          review\\n          reviewId\\n          __typename\\n        }\\n        imageUrls\\n        markerId @include(if: $isNmap)\\n        imageMarker @include(if: $isNmap) {\\n          marker\\n          markerSelected\\n          __typename\\n        }\\n        markerLabel @include(if: $isNmap) {\\n          text\\n          style\\n          __typename\\n        }\\n        isDelivery\\n        isTakeOut\\n        isPreOrder\\n        isTableOrder\\n        naverBookingCategory\\n        bookingDisplayName\\n        bookingBusinessId\\n        bookingVisitId\\n        bookingPickupId\\n        baemin {\\n          businessHours {\\n            deliveryTime {\\n              start\\n              end\\n              __typename\\n            }\\n            closeDate {\\n              start\\n              end\\n              __typename\\n            }\\n            temporaryCloseDate {\\n              start\\n              end\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        yogiyo {\\n          businessHours {\\n            actualDeliveryTime {\\n              start\\n              end\\n              __typename\\n            }\\n            bizHours {\\n              start\\n              end\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        detailCid {\\n          c0\\n          c1\\n          c2\\n          c3\\n          __typename\\n        }\\n        streetPanorama {\\n          id\\n          pan\\n          tilt\\n          lat\\n          lon\\n          __typename\\n        }\\n        poiInfo {\\n          polyline {\\n            shapeKey {\\n              id\\n              name\\n              version\\n              __typename\\n            }\\n            boundary {\\n              minX\\n              minY\\n              maxX\\n              maxY\\n              __typename\\n            }\\n            details {\\n              totalDistance\\n              arrivalAddress\\n              departureAddress\\n              __typename\\n            }\\n            __typename\\n          }\\n          polygon {\\n            shapeKey {\\n              id\\n              name\\n              version\\n              __typename\\n            }\\n            boundary {\\n              minX\\n              minY\\n              maxX\\n              maxY\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        newOpening\\n        newBusinessHours {\\n          status\\n          description\\n          __typename\\n        }\\n        coupon {\\n          total\\n          promotions {\\n            promotionSeq\\n            couponSeq\\n            conditionType\\n            image {\\n              url\\n              __typename\\n            }\\n            title\\n            description\\n            type\\n            couponUseType\\n            __typename\\n          }\\n          __typename\\n        }\\n        mid\\n        __typename\\n      }\\n      optionsForMap @include(if: $isBounds) {\\n        ...OptionsForMap\\n        __typename\\n      }\\n      queryString\\n      siteSort\\n      couponItemsCount\\n      searchGuide @skip(if: $isFetchMore) {\\n        queryResults {\\n          regions {\\n            displayTitle\\n            query\\n            region {\\n              rcode\\n              __typename\\n            }\\n            __typename\\n          }\\n          isBusinessName\\n          __typename\\n        }\\n        queryIndex\\n        types\\n        __typename\\n      }\\n      __typename\\n    }\\n    filters {\\n      regionFilter {\\n        name\\n        value\\n        synonyms\\n        __typename\\n      }\\n      brandFilter {\\n        name\\n        displayName\\n        cid\\n        __typename\\n      }\\n      __typename\\n    }\\n    component {\\n      data\\n      type\\n      position\\n      __typename\\n    }\\n    queryResult @skip(if: $isFetchMore) {\\n      keyword\\n      categories\\n      region\\n      isBrandList\\n      filterBooking\\n      hasNearQuery\\n      isShelterType\\n      listType\\n      theme\\n      type\\n      context\\n      __typename\\n    }\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}"}]`;
}

/**
 * 여행.
 */
function getPostDataTrip(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{"operationName":"getTrips","variables":{"isBounds":false,"input":{"query":"${keyword}","start":${start},"display":100,"x":"${geo_x}","y":"${geo_y}","deviceType":"mobile","sortingOrder":"trendy","filterCoupon":false,"filterBooking":false,"filterOpentime":false},"isNmap":false},"query":"query getTrips($input: TripsInput, $isBounds: Boolean = false, $isNmap: Boolean!) {\\n  trips(input: $input) {\\n    total\\n    searchGuide @include(if: $isNmap) {\\n      queryResults {\\n        regions {\\n          displayTitle\\n          query\\n          __typename\\n        }\\n        isBusinessName\\n        __typename\\n      }\\n      queryIndex\\n      types\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      __typename\\n    }\\n    isSubSearch\\n    isContentSearch\\n    isLastContent\\n    travelHeader {\\n      title\\n      backgroundColor\\n      gnbFontColor\\n      tabFontColor\\n      searchPage\\n      tabs {\\n        name\\n        url\\n        __typename\\n      }\\n      __typename\\n    }\\n    bookmarks @skip(if: $isNmap) {\\n      name\\n      id\\n      bookmarkId\\n      apolloCacheId\\n      x\\n      y\\n      folderMappings {\\n        id\\n        markerColor\\n        isDefaultFolder\\n        __typename\\n      }\\n      base {\\n        id\\n        name\\n        category\\n        microReview\\n        imageUrl\\n        imageUrls\\n        keywords\\n        blogCafeReviewCount\\n        visitorReviewCount\\n        address\\n        commonAddress\\n        newBusinessHours {\\n          status\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    themes {\\n      name\\n      value\\n      __typename\\n    }\\n    tags {\\n      name\\n      value\\n      img\\n      __typename\\n    }\\n    selectedFilter {\\n      theme\\n      tag\\n      __typename\\n    }\\n    items {\\n      ...TripItemFields\\n      __typename\\n    }\\n    nlu {\\n      queryResult {\\n        region\\n        spotid\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment TripItemFields on TripSummary {\\n  id\\n  apolloCacheId\\n  name\\n  x\\n  y\\n  distance\\n  bookingUrl\\n  categoryCodeList\\n  address\\n  roadAddress\\n  commonAddress\\n  promotionTitle\\n  imageUrl\\n  imageUrls\\n  tags\\n  microReview\\n  blogCafeReviewCount\\n  visitorReviewCount\\n  contentReviewCount\\n  category\\n  dbType\\n  virtualPhone\\n  phone\\n  hasBooking\\n  hasNPay\\n  bookingVisitId\\n  bookingPickupId\\n  isTableOrder\\n  isPreOrder\\n  isTakeOut\\n  bookingBusinessId\\n  talktalkUrl\\n  isDelivery\\n  isCvsDelivery\\n  imageMarker @include(if: $isNmap) {\\n    marker\\n    markerSelected\\n    __typename\\n  }\\n  markerId @include(if: $isNmap)\\n  markerLabel @include(if: $isNmap) {\\n    text\\n    style\\n    __typename\\n  }\\n  bookingDisplayName\\n  bookingHubUrl\\n  bookingHubButtonName\\n  blogImages {\\n    thumbnailUrl\\n    postUrl\\n    authorId\\n    postNo\\n    authorName\\n    profileImageUrl\\n    gdid\\n    __typename\\n  }\\n  streetPanorama {\\n    id\\n    pan\\n    tilt\\n    lat\\n    lon\\n    __typename\\n  }\\n  newBusinessHours {\\n    status\\n    __typename\\n  }\\n  baemin {\\n    businessHours {\\n      deliveryTime {\\n        start\\n        end\\n        __typename\\n      }\\n      closeDate {\\n        start\\n        end\\n        __typename\\n      }\\n      temporaryCloseDate {\\n        start\\n        end\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  yogiyo {\\n    businessHours {\\n      actualDeliveryTime {\\n        start\\n        end\\n        __typename\\n      }\\n      bizHours {\\n        start\\n        end\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  coupon {\\n    total\\n    promotions {\\n      promotionSeq\\n      couponSeq\\n      conditionType\\n      image {\\n        url\\n        __typename\\n      }\\n      title\\n      description\\n      type\\n      couponUseType\\n      __typename\\n    }\\n    __typename\\n  }\\n  newOpening\\n  contents {\\n    type\\n    id\\n    title\\n    description\\n    startDate\\n    endDate\\n    time\\n    imageUrl\\n    authName\\n    isBooking\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}"}]`;
}

/**
 * 자동차검사소
 */
function getPostDataInspection(keyword: string, start: number, geo_x: string, geo_y: string) {
  return `[{\"operationName\":\"getMotorInspectionList\",\"variables\":{\"useReverseGeocode\":false,\"isNx\":false,\"input\":{\"query\":\"${keyword}\",\"start\":${start},\"display\":100,\"x\":\"${geo_x}\",\"y\":\"${geo_y}\",\"deviceType\":\"pc\"},\"isBounds\":false,\"isNmap\":false},\"query\":\"query getMotorInspectionList($input: PlacesInput!, $tsInput: TSInput, $isNmap: Boolean!, $isBounds: Boolean!, $reverseGeocodingInput: ReverseGeocodingInput, $useReverseGeocode: Boolean = false, $isNx: Boolean = false) {\\n  motorInspection {\\n    businesses: inspections(input: $input, tsInput: $tsInput, isNx: $isNx) {\\n      total\\n      items {\\n        id\\n        name\\n        normalizedName\\n        category\\n        detailCid {\\n          c0\\n          c1\\n          c2\\n          c3\\n          __typename\\n        }\\n        gdid\\n        categoryCodeList\\n        dbType\\n        distance\\n        tsId\\n        roadAddress\\n        address\\n        fullAddress\\n        commonAddress\\n        bookingUrl\\n        phone\\n        virtualPhone\\n        businessHours\\n        daysOff\\n        imageUrl\\n        imageCount\\n        x\\n        y\\n        poiInfo {\\n          polyline {\\n            shapeKey {\\n              id\\n              name\\n              version\\n              __typename\\n            }\\n            boundary {\\n              minX\\n              minY\\n              maxX\\n              maxY\\n              __typename\\n            }\\n            details {\\n              totalDistance\\n              arrivalAddress\\n              departureAddress\\n              __typename\\n            }\\n            __typename\\n          }\\n          polygon {\\n            shapeKey {\\n              id\\n              name\\n              version\\n              __typename\\n            }\\n            boundary {\\n              minX\\n              minY\\n              maxX\\n              maxY\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        subwayId\\n        markerId @include(if: $isNmap)\\n        markerLabel @include(if: $isNmap) {\\n          text\\n          style\\n          stylePreset\\n          __typename\\n        }\\n        imageMarker @include(if: $isNmap) {\\n          marker\\n          markerSelected\\n          __typename\\n        }\\n        oilPrice @include(if: $isNmap) {\\n          gasoline\\n          diesel\\n          lpg\\n          __typename\\n        }\\n        isPublicGas\\n        isDelivery\\n        isTableOrder\\n        isPreOrder\\n        isTakeOut\\n        isCvsDelivery\\n        hasBooking\\n        naverBookingCategory\\n        bookingDisplayName\\n        bookingBusinessId\\n        bookingVisitId\\n        bookingPickupId\\n        baemin {\\n          businessHours {\\n            deliveryTime {\\n              start\\n              end\\n              __typename\\n            }\\n            closeDate {\\n              start\\n              end\\n              __typename\\n            }\\n            temporaryCloseDate {\\n              start\\n              end\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        yogiyo {\\n          businessHours {\\n            actualDeliveryTime {\\n              start\\n              end\\n              __typename\\n            }\\n            bizHours {\\n              start\\n              end\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        isPollingStation\\n        hasNPay\\n        talktalkUrl\\n        visitorReviewCount\\n        visitorReviewScore\\n        blogCafeReviewCount\\n        bookingReviewCount\\n        streetPanorama {\\n          id\\n          pan\\n          tilt\\n          lat\\n          lon\\n          __typename\\n        }\\n        naverBookingHubId\\n        bookingHubUrl\\n        bookingHubButtonName\\n        newOpening\\n        newBusinessHours {\\n          status\\n          description\\n          dayOff\\n          dayOffDescription\\n          __typename\\n        }\\n        coupon {\\n          total\\n          promotions {\\n            promotionSeq\\n            couponSeq\\n            conditionType\\n            image {\\n              url\\n              __typename\\n            }\\n            title\\n            description\\n            type\\n            couponUseType\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      carTSInfo {\\n        carNumber\\n        carName\\n        type\\n        startDate\\n        endDate\\n        __typename\\n      }\\n      optionsForMap @include(if: $isBounds) {\\n        ...OptionsForMap\\n        displayCorrectAnswer\\n        correctAnswerPlaceId\\n        __typename\\n      }\\n      searchGuide @include(if: $isNx) {\\n        queryResults {\\n          regions {\\n            displayTitle\\n            query\\n            region {\\n              rcode\\n              __typename\\n            }\\n            __typename\\n          }\\n          isBusinessName\\n          __typename\\n        }\\n        queryIndex\\n        types\\n        __typename\\n      }\\n      queryString\\n      siteSort\\n      filterBooking\\n      __typename\\n    }\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}\"}]`;
}

/**
 * 기본
 */
export function getPostDataDefault(keyword: string, start: number, geo_x: string, geo_y: string, sessionId: string) {
  return `[{"operationName":"getPlacesList","variables":{"useReverseGeocode":false,"input":{"query":"${keyword}","start":${start},"display":100,"adult":false,"spq":false,"queryRank":"","x":"${geo_x}","y":"${geo_y}","deviceType":"mobile","sessionId":"${sessionId ?? ''}"},"isNmap":false,"isBounds":false},"query":"query getPlacesList($input: PlacesInput, $isNmap: Boolean\u0021, $isBounds: Boolean\u0021, $reverseGeocodingInput: ReverseGeocodingInput, $useReverseGeocode: Boolean = false) {\\n  businesses: places(input: $input) {\\n    total\\n    items {\\n      id\\n      gdid\\n      name\\n      normalizedName\\n      category\\n      detailCid {\\n        c0\\n        c1\\n        c2\\n        c3\\n        __typename\\n      }\\n      categoryCodeList\\n      dbType\\n      distance\\n      roadAddress\\n      address\\n      fullAddress\\n      commonAddress\\n      bookingUrl\\n      phone\\n      virtualPhone\\n      businessHours\\n      daysOff\\n      imageUrl\\n      imageCount\\n      x\\n      y\\n      poiInfo {\\n        polyline {\\n          shapeKey {\\n            id\\n            name\\n            version\\n            __typename\\n          }\\n          boundary {\\n            minX\\n            minY\\n            maxX\\n            maxY\\n            __typename\\n          }\\n          details {\\n            totalDistance\\n            arrivalAddress\\n            departureAddress\\n            __typename\\n          }\\n          __typename\\n        }\\n        polygon {\\n          shapeKey {\\n            id\\n            name\\n            version\\n            __typename\\n          }\\n          boundary {\\n            minX\\n            minY\\n            maxX\\n            maxY\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      subwayId\\n      markerId @include(if: $isNmap)\\n      markerLabel @include(if: $isNmap) {\\n        text\\n        style\\n        stylePreset\\n        __typename\\n      }\\n      imageMarker @include(if: $isNmap) {\\n        marker\\n        markerSelected\\n        __typename\\n      }\\n      oilPrice @include(if: $isNmap) {\\n        gasoline\\n        diesel\\n        lpg\\n        __typename\\n      }\\n      isPublicGas\\n      isDelivery\\n      isTableOrder\\n      isPreOrder\\n      isTakeOut\\n      isCvsDelivery\\n      hasBooking\\n      naverBookingCategory\\n      bookingDisplayName\\n      bookingBusinessId\\n      bookingVisitId\\n      bookingPickupId\\n      baemin {\\n        businessHours {\\n          deliveryTime {\\n            start\\n            end\\n            __typename\\n          }\\n          closeDate {\\n            start\\n            end\\n            __typename\\n          }\\n          temporaryCloseDate {\\n            start\\n            end\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      yogiyo {\\n        businessHours {\\n          actualDeliveryTime {\\n            start\\n            end\\n            __typename\\n          }\\n          bizHours {\\n            start\\n            end\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      isPollingStation\\n      hasNPay\\n      talktalkUrl\\n      visitorReviewCount\\n      visitorReviewScore\\n      blogCafeReviewCount\\n      bookingReviewCount\\n      streetPanorama {\\n        id\\n        pan\\n        tilt\\n        lat\\n        lon\\n        __typename\\n      }\\n      naverBookingHubId\\n      bookingHubUrl\\n      bookingHubButtonName\\n      newOpening\\n      newBusinessHours {\\n        status\\n        description\\n        dayOff\\n        dayOffDescription\\n        __typename\\n      }\\n      coupon {\\n        total\\n        promotions {\\n          promotionSeq\\n          couponSeq\\n          conditionType\\n          image {\\n            url\\n            __typename\\n          }\\n          title\\n          description\\n          type\\n          couponUseType\\n          __typename\\n        }\\n        __typename\\n      }\\n      mid\\n      hasMobilePhoneNumber\\n      hiking {\\n        distance\\n        startName\\n        endName\\n        __typename\\n      }\\n      __typename\\n    }\\n    optionsForMap @include(if: $isBounds) {\\n      ...OptionsForMap\\n      displayCorrectAnswer\\n      correctAnswerPlaceId\\n      __typename\\n    }\\n    searchGuide {\\n      queryResults {\\n        regions {\\n          displayTitle\\n          query\\n          region {\\n            rcode\\n            __typename\\n          }\\n          __typename\\n        }\\n        isBusinessName\\n        __typename\\n      }\\n      queryIndex\\n      types\\n      __typename\\n    }\\n    queryString\\n    siteSort\\n    __typename\\n  }\\n  reverseGeocodingAddr(input: $reverseGeocodingInput) @include(if: $useReverseGeocode) {\\n    ...ReverseGeocodingAddr\\n    __typename\\n  }\\n}\\n\\nfragment OptionsForMap on OptionsForMap {\\n  maxZoom\\n  minZoom\\n  includeMyLocation\\n  maxIncludePoiCount\\n  center\\n  spotId\\n  keepMapBounds\\n  __typename\\n}\\n\\nfragment ReverseGeocodingAddr on ReverseGeocodingResult {\\n  rcode\\n  region\\n  __typename\\n}"}]`;
}