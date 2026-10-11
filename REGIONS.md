# Regions
Thailand primary: nationwide coordinate-based retrieval, all 77 provinces including Bangkok. Province preset coordinates represent approximate administrative-city centers, not province averages or boundaries. No coupling to flood/radar availability. Thai/English local province search is always available. Open-Meteo/GeoNames remote place search filters TH, but village/district names/Thai transliterations may be incomplete; users can select a point on the map. No claim that every street/address is searchable.

WGS84 canonical coordinates. Coordinate selection accepts Thai country polygon only (generalized Natural Earth 1:10m; border/coastal precision limitations) and exact three China presets. Geolocation in China resolves only to a permitted city within a documented city radius; never expands China coverage. No GCJ-02 basemap. Asia/Bangkok UTC+7 for Thailand; Asia/Shanghai UTC+8 for all three China cities. Persist preset location IDs, never implicit GPS position. Explicit favorite saving is opt-in for selected coordinates.

Secondary presets: Xi’an 西安 34.2658,108.9541; Chengdu 成都 30.5728,104.0668; Chongqing 重庆 29.5630,106.5516. Thai-language labels. No Thailand official alerts/flood providers run for China. Radar coverage not guaranteed in any city. Open-Meteo compatible forecast/AQ independent of QWeather.

77-province registry lives in src/locations/provinces.ts and is validated for count, uniqueness, country and timezone. Complete table appended after implementation.

## Province preset registry
| Thai | English | Latitude | Longitude |
|---|---|---|---|
|กรุงเทพมหานคร | Bangkok | 13.7563 | 100.5018|
|กระบี่ | Krabi | 8.0863 | 98.9063|
|กาญจนบุรี | Kanchanaburi | 14.0228 | 99.5328|
|กาฬสินธุ์ | Kalasin | 16.4314 | 103.5059|
|กำแพงเพชร | Kamphaeng Phet | 16.4828 | 99.5227|
|ขอนแก่น | Khon Kaen | 16.4419 | 102.835|
|จันทบุรี | Chanthaburi | 12.6113 | 102.1038|
|ฉะเชิงเทรา | Chachoengsao | 13.6904 | 101.0779|
|ชลบุรี | Chon Buri | 13.3611 | 100.9847|
|ชัยนาท | Chai Nat | 15.1852 | 100.1251|
|ชัยภูมิ | Chaiyaphum | 15.8068 | 102.0315|
|ชุมพร | Chumphon | 10.493 | 99.180|
|เชียงราย | Chiang Rai | 19.9105 | 99.8406|
|เชียงใหม่ | Chiang Mai | 18.7883 | 98.9853|
|ตรัง | Trang | 7.5594 | 99.611|
|ตราด | Trat | 12.2428 | 102.5175|
|ตาก | Tak | 16.8835 | 99.1258|
|นครนายก | Nakhon Nayok | 14.2069 | 101.2131|
|นครปฐม | Nakhon Pathom | 13.8199 | 100.0622|
|นครพนม | Nakhon Phanom | 17.392 | 104.7695|
|นครราชสีมา | Nakhon Ratchasima | 14.9799 | 102.0978|
|นครศรีธรรมราช | Nakhon Si Thammarat | 8.4304 | 99.9631|
|นครสวรรค์ | Nakhon Sawan | 15.7047 | 100.1372|
|นนทบุรี | Nonthaburi | 13.8621 | 100.5144|
|นราธิวาส | Narathiwat | 6.4255 | 101.8253|
|น่าน | Nan | 18.7756 | 100.773|
|บึงกาฬ | Bueng Kan | 18.3609 | 103.6466|
|บุรีรัมย์ | Buri Ram | 14.993 | 103.1029|
|ปทุมธานี | Pathum Thani | 14.0208 | 100.525|
|ประจวบคีรีขันธ์ | Prachuap Khiri Khan | 11.8124 | 99.7973|
|ปราจีนบุรี | Prachin Buri | 14.0509 | 101.372|
|ปัตตานี | Pattani | 6.8694 | 101.2501|
|พระนครศรีอยุธยา | Phra Nakhon Si Ayutthaya | 14.3692 | 100.5877|
|พะเยา | Phayao | 19.1665 | 99.9019|
|พังงา | Phang Nga | 8.4501 | 98.5255|
|พัทลุง | Phatthalung | 7.6167 | 100.074|
|พิจิตร | Phichit | 16.4429 | 100.3488|
|พิษณุโลก | Phitsanulok | 16.8211 | 100.2659|
|เพชรบุรี | Phetchaburi | 13.1112 | 99.939|
|เพชรบูรณ์ | Phetchabun | 16.4189 | 101.1595|
|แพร่ | Phrae | 18.1446 | 100.1403|
|ภูเก็ต | Phuket | 7.8804 | 98.3923|
|มหาสารคาม | Maha Sarakham | 16.185 | 103.3007|
|มุกดาหาร | Mukdahan | 16.5425 | 104.7235|
|แม่ฮ่องสอน | Mae Hong Son | 19.302 | 97.9654|
|ยโสธร | Yasothon | 15.7926 | 104.1453|
|ยะลา | Yala | 6.5411 | 101.2804|
|ร้อยเอ็ด | Roi Et | 16.0538 | 103.652|
|ระนอง | Ranong | 9.9529 | 98.6085|
|ระยอง | Rayong | 12.6814 | 101.2816|
|ราชบุรี | Ratchaburi | 13.5283 | 99.8134|
|ลพบุรี | Lop Buri | 14.7995 | 100.6534|
|ลำปาง | Lampang | 18.2888 | 99.4909|
|ลำพูน | Lamphun | 18.5745 | 99.0087|
|เลย | Loei | 17.486 | 101.7223|
|ศรีสะเกษ | Si Sa Ket | 15.1186 | 104.322|
|สกลนคร | Sakon Nakhon | 17.1546 | 104.1348|
|สงขลา | Songkhla | 7.1898 | 100.5951|
|สตูล | Satun | 6.6238 | 100.0674|
|สมุทรปราการ | Samut Prakan | 13.5991 | 100.5998|
|สมุทรสงคราม | Samut Songkhram | 13.4098 | 100.0023|
|สมุทรสาคร | Samut Sakhon | 13.5475 | 100.2744|
|สระแก้ว | Sa Kaeo | 13.824 | 102.0646|
|สระบุรี | Saraburi | 14.5289 | 100.9101|
|สิงห์บุรี | Sing Buri | 14.891 | 100.3967|
|สุโขทัย | Sukhothai | 17.0056 | 99.8264|
|สุพรรณบุรี | Suphan Buri | 14.4745 | 100.1177|
|สุราษฎร์ธานี | Surat Thani | 9.1382 | 99.3215|
|สุรินทร์ | Surin | 14.8818 | 103.4936|
|หนองคาย | Nong Khai | 17.8783 | 102.742|
|หนองบัวลำภู | Nong Bua Lam Phu | 17.2218 | 102.426|
|อ่างทอง | Ang Thong | 14.5896 | 100.4551|
|อำนาจเจริญ | Amnat Charoen | 15.8657 | 104.6258|
|อุดรธานี | Udon Thani | 17.4138 | 102.787|
|อุตรดิตถ์ | Uttaradit | 17.6201 | 100.0993|
|อุทัยธานี | Uthai Thani | 15.3835 | 100.0246|
|อุบลราชธานี | Ubon Ratchathani | 15.2448 | 104.8473|
