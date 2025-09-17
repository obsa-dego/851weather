import { json, error } from '@sveltejs/kit';

// 한글을 로마자로 변환하는 함수
function hangulToRoman(text) {
	// 한글 여부 확인
	if (!/[가-힣]/.test(text)) {
		return text;
	}

	// 초성, 중성, 종성 매핑 테이블
	const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
	const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
	const JONG = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

	let result = '';

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const code = char.charCodeAt(0);

		// 한글 음절인 경우
		if (code >= 0xAC00 && code <= 0xD7A3) {
			const baseCode = code - 0xAC00;
			const choIndex = Math.floor(baseCode / 588);
			const jungIndex = Math.floor((baseCode % 588) / 28);
			const jongIndex = baseCode % 28;

			result += CHO[choIndex] + JUNG[jungIndex] + JONG[jongIndex];
		} else {
			result += char;
		}
	}

	// 첫 글자를 대문자로
	return result.charAt(0).toUpperCase() + result.slice(1);
}

export async function GET({ url }) {
	const query = url.searchParams.get('q');

	if (!query) {
		throw error(400, 'Search query is required');
	}

	try {
		// 주요 도시는 정확한 영어 매핑 사용
		const koreanToEnglish = {
			'서울': 'Seoul',
			'부산': 'Busan',
			'대구': 'Daegu',
			'인천': 'Incheon',
			'광주': 'Gwangju',
			'대전': 'Daejeon',
			'울산': 'Ulsan',
			'수원': 'Suwon',
			'고양': 'Goyang',
			'창원': 'Changwon',
			'성남': 'Seongnam',
			'청주': 'Cheongju',
			'부천': 'Bucheon',
			'화성': 'Hwaseong',
			'안산': 'Ansan',
			'안양': 'Anyang',
			'김포': 'Gimpo',
			'제주': 'Jeju',
			'전주': 'Jeonju',
			'천안': 'Cheonan',
			'포항': 'Pohang',
			'진주': 'Jinju'
		};

		// 검색어를 영어로 변환
		let searchTerm;
		if (koreanToEnglish[query]) {
			// 매핑에 있는 경우 사용
			searchTerm = koreanToEnglish[query];
			console.log(`매핑 사용: ${query} → ${searchTerm}`);
		} else if (/[가-힣]/.test(query)) {
			// 한글이지만 매핑에 없는 경우 로마자 변환
			searchTerm = hangulToRoman(query);
			console.log(`로마자 변환: ${query} → ${searchTerm}`);
		} else {
			// 영어인 경우 그대로 사용
			searchTerm = query;
		}

		const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=10&language=en&format=json`;

		console.log('Open-Meteo Search URL:', searchUrl);

		const response = await fetch(searchUrl);

		if (!response.ok) {
			throw error(response.status, `Search failed: ${response.status}`);
		}

		const data = await response.json();
		console.log('Open-Meteo Search Response:', data);

		// 결과가 있으면 AccuWeather 형식과 유사하게 변환
		if (data.results && data.results.length > 0) {
			// 한국 도시만 필터링 (API 결과는 모두 관련성이 있는 것으로 간주)
			const filteredResults = data.results.filter(result => {
				return result.country === 'South Korea';
			});

			// 모든 결과를 표시 (중복 제거 안함)
			// 인구수 기준으로 정렬 (큰 도시 우선)
			const uniqueResults = filteredResults.sort((a, b) => (b.population || 0) - (a.population || 0));

			const transformedResults = uniqueResults.map(result => {
				// 검색어와 매칭되는 행정구역 찾기 함수
				const findMatchingAdminName = (originalQuery, result) => {
					const queryLower = originalQuery.toLowerCase();
					const currentSearchTerm = searchTerm || originalQuery;
					const searchLower = currentSearchTerm.toLowerCase();

					// admin2에서 검색어와 매칭되는지 확인
					if (result.admin2) {
						const admin2Lower = result.admin2.toLowerCase();
						if (admin2Lower.includes(queryLower) || admin2Lower.includes(searchLower)) {
							return toKorean(result.admin2);
						}
					}

					// admin3에서 검색어와 매칭되는지 확인
					if (result.admin3) {
						const admin3Lower = result.admin3.toLowerCase();
						if (admin3Lower.includes(queryLower) || admin3Lower.includes(searchLower)) {
							return toKorean(result.admin3);
						}
					}

					// 한글 검색어인 경우 로마자 변환해서 확인
					if (/[가-힣]/.test(originalQuery)) {
						const romanized = hangulToRoman(originalQuery).toLowerCase();

						if (result.admin2) {
							const admin2Lower = result.admin2.toLowerCase();
							if (admin2Lower.includes(romanized)) {
								return toKorean(result.admin2);
							}
						}

						if (result.admin3) {
							const admin3Lower = result.admin3.toLowerCase();
							if (admin3Lower.includes(romanized)) {
								return toKorean(result.admin3);
							}
						}
					}

					return null;
				};
				// 지역명 한글 매핑
				const adminNameMap = {
					'Gyeonggi': '경기도',
					'Gyeonggi-do': '경기도',
					'Seoul': '서울특별시',
					'Busan': '부산광역시',
					'Daegu': '대구광역시',
					'Incheon': '인천광역시',
					'Gwangju': '광주광역시',
					'Daejeon': '대전광역시',
					'Ulsan': '울산광역시',
					'Jeju': '제주도',
					'Gangwon': '강원도',
					'Gangwon-do': '강원도',
					'Chungcheongbuk-do': '충청북도',
					'North Chungcheong': '충청북도',
					'Chungcheongnam-do': '충청남도',
					'South Chungcheong': '충청남도',
					'Jeollabuk-do': '전라북도',
					'North Jeolla': '전라북도',
					'Jeollanam-do': '전라남도',
					'South Jeolla': '전라남도',
					'Gyeongsangbuk-do': '경상북도',
					'North Gyeongsang': '경상북도',
					'Gyeongsangnam-do': '경상남도',
					'South Gyeongsang': '경상남도'
				};

				const adminName = adminNameMap[result.admin1] || result.admin1 || '';

				// 영어 지명을 한글로 변환하는 매핑
				const placeNameMap = {
					// 시/군
					'Suwon-si': '수원시',
					'Pocheon-si': '포천시',
					'Gochang-gun': '고창군',
					'Buyeo-gun': '부여군',
					'Yeonggwang-gun': '영광군',
					'Gimpo-si': '김포시',
					'Gwangmyeong-si': '광명시',
					'Uijeongbu-si': '의정부시',
					'Gongju-si': '공주시',
					// 면/동
					'Gongeum-myeon': '공음면',
					'Yanghwa-myeon': '양화면',
					'Gunnam-myeon': '군남면',
					'Myoryang-myeon': '묘량면',
					'Gyuam-myeon': '규암면',
					'Ongnyong-dong': '옹룡동',
					'Useong-myeon': '우성면',
					'Yeonsan-myeon': '연산면',
					'U-dong': '우동'
				};

				// 행정구역 한글 변환 함수
				const toKorean = (text) => {
					if (!text) return '';

					// 먼저 전체 매핑에서 찾기
					if (placeNameMap[text]) {
						return placeNameMap[text];
					}

					// 없으면 일반 변환 규칙 적용
					let korean = text;

					// 주요 지역명 변환
					korean = korean
						.replace(/\bSuwon\b/gi, '수원')
						.replace(/\bPocheon\b/gi, '포천')
						.replace(/\bGochang\b/gi, '고창')
						.replace(/\bBuyeo\b/gi, '부여')
						.replace(/\bYeonggwang\b/gi, '영광')
						.replace(/\bGongeum\b/gi, '공음')
						.replace(/\bYanghwa\b/gi, '양화')
						.replace(/\bGunnam\b/gi, '군남')
						.replace(/\bMyoryang\b/gi, '묘량')
						.replace(/\bGyuam\b/gi, '규암')
						.replace(/\bGimpo\b/gi, '김포')
						.replace(/\bGwangmyeong\b/gi, '광명')
						.replace(/\bUijeongbu\b/gi, '의정부')
						.replace(/\bGongju\b/gi, '공주')
						.replace(/\bOngnyong\b/gi, '옹룡')
						.replace(/\bGoyang\b/gi, '고양')
						.replace(/\bKoyang\b/gi, '고양')
						.replace(/\bNonsan\b/gi, '논산')
						.replace(/\bHanam\b/gi, '하남')
						.replace(/\bUseong\b/gi, '우성')
						.replace(/\bYeonsan\b/gi, '연산')
						.replace(/\bHaeundae\b/gi, '해운대')
						.replace(/\bGangnam\b/gi, '강남')
						.replace(/\bJongno\b/gi, '종로')
						.replace(/\bMapo\b/gi, '마포')
						.replace(/\bYeongdeungpo\b/gi, '영등포')
						.replace(/\bSongpa\b/gi, '송파')
						.replace(/\bGangseo\b/gi, '강서')
						.replace(/\bDongdaemun\b/gi, '동대문')
						.replace(/\bSeodaemun\b/gi, '서대문');

					// 행정구역 접미사 변환
					korean = korean
						.replace(/-si$/i, '시')
						.replace(/-gun$/i, '군')
						.replace(/-gu$/i, '구')
						.replace(/-do$/i, '도')
						.replace(/-myeon$/i, '면')
						.replace(/-eup$/i, '읍')
						.replace(/-dong$/i, '동')
						.replace(/-ri$/i, '리');

					return korean;
				};

				// 특수 지명 한글 변환
				const specialNameMap = {
					'Suwongol': '수원골',
					'Suwonteo': '수원터',
					'Uijeongbu-si': '의정부시',
					'Uijeongbu sam dong': '의정부3동',
					'Uijeongbu i dong': '의정부2동',
					'Uijeongbu il dong': '의정부1동',
					'Goyang-si': '고양시',
					'Goyang': '고양',
					'Goyanggol': '고양골',
					'Goyanggyo': '고양교',
					'Koyang-ni': '고양리',
					'Koyang': '고양',
					'Gongju-si': '공주시',
					'Nonsan-si': '논산시',
					'Hanam-si': '하남시',
					'Haeundae': '해운대',
					'Haeundaegongwon': '해운대공원',
					'Haeundae-gu': '해운대구',
					'U-dong': '우동'
				};

				// 메인 이름과 세부 주소 생성
				let displayName = '';
				let detailedAddress = '';

				// 1. 먼저 특수 지명이 있는지 확인 (세부 구분 우선)
				if (specialNameMap[result.name]) {
					displayName = specialNameMap[result.name];

					// 세부 주소 생성
					const parts = [adminName];
					if (result.admin2) {
						parts.push(toKorean(result.admin2));
					}
					if (result.admin3 && !displayName.includes('동')) {
						parts.push(toKorean(result.admin3));
					}
					detailedAddress = parts.filter(p => p).join(' ');
				}
				// 2. 검색어와 매칭되는 행정구역이 있는지 확인
				else {
					const matchingAdminName = findMatchingAdminName(query, result);
					if (matchingAdminName) {
						displayName = matchingAdminName;

						// 세부 주소 생성 (매칭된 행정구역 제외하고)
						const parts = [adminName];
						if (result.admin2 && toKorean(result.admin2) !== matchingAdminName) {
							parts.push(toKorean(result.admin2));
						}
						if (result.admin3 && toKorean(result.admin3) !== matchingAdminName) {
							parts.push(toKorean(result.admin3));
						}
						detailedAddress = parts.filter(p => p).join(' ');
					}
					// 3. 주요 도시인 경우 (인구가 많거나 -si로 끝나는 경우)
					else if (result.admin2 && result.admin2.endsWith('-si')) {
						// 메인: "수원시", 세부: "경기도 수원시"
						displayName = toKorean(result.admin2);
						detailedAddress = `${adminName} ${displayName}`;
					}
					// 4. 작은 마을인 경우
					else {
						// admin3가 있으면 "리" 형식으로 표시
						if (result.admin3) {
							if (result.name === 'Suwon') {
								displayName = '수원리';
							} else if (result.name === 'Pocheon') {
								displayName = '포천리';
							} else {
								// admin3가 면(myeon)으로 끝나는 경우 name은 리(ri) 단위
								const koreanName = toKorean(result.name);
								if (result.admin3.endsWith('-myeon') && !koreanName.endsWith('리')) {
									displayName = koreanName + '리';
								} else {
									displayName = koreanName;
								}
							}
						} else {
							// admin3가 없으면 그냥 마을명
							if (result.name === 'Suwon') {
								displayName = '수원';
							} else if (result.name === 'Pocheon') {
								displayName = '포천';
							} else {
								displayName = toKorean(result.name);
							}
						}

						// 세부 주소: 도 + 군 + 면
						const parts = [adminName];
						if (result.admin2) {
							parts.push(toKorean(result.admin2));
						}
						if (result.admin3) {
							parts.push(toKorean(result.admin3));
						}

						detailedAddress = parts.filter(p => p).join(' ');
					}
				}

				return {
					Key: `${result.latitude}_${result.longitude}`,
					LocalizedName: displayName,
					DetailedAddress: detailedAddress,
					EnglishName: result.name,
					Country: {
						LocalizedName: '대한민국',
						EnglishName: 'South Korea'
					},
					AdministrativeArea: {
						LocalizedName: adminName,
						EnglishName: result.admin1 || ''
					},
					IsAlias: false,
					latitude: result.latitude,
					longitude: result.longitude,
					timezone: result.timezone || 'Asia/Seoul',
					population: result.population || 0
				};
			});

			return json(transformedResults);
		}

		return json([]);
	} catch (err) {
		console.error('Search error:', err);
		throw error(err.status || 500, err.body?.message || 'Failed to search locations');
	}
}