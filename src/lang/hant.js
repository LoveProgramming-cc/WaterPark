// 繁體中文. The game's strings are Simplified; this is every character they use that differs, as pairs (简繁简繁…),
// plus the few places where one Simplified character has two Traditional ones and the plain mapping picks wrong.
const PAIRS = '寻尋启啟给給镜鏡电電楼樓体體课課气氣响響册冊随隨见見热熱专專东東两兩个個为為么麼乐樂乱亂从從们們价價会會偿償儿兒关關内內写寫冲沖减減几幾击擊刘劉刚剛别別务務动動区區单單卖賣厅廳压壓双雙发發后後吗嗎员員园園图圖坏壞垫墊墙牆声聲处處头頭妈媽对對导導将將尽盡岁歲带帶干乾广廣开開张張弯彎总總戏戲拧擰挂掛挡擋数數时時暂暫机機杆桿条條来來柜櫃标標栏欄样樣桥橋欢歡没沒涂塗湿濕潜潛灯燈点點烁爍环環现現画畫盏盞监監盖蓋着著矿礦确確简簡线線绕繞绝絕继繼续續肠腸肤膚脏髒脚腳装裝视視览覽觉覺计計认認让讓议議记記设設试試话話语語说說请請谢謝贴貼贵貴赔賠赵趙转轉轮輪边邊过過还還这這进進远遠选選遗遺里裡钩鈎铁鐵链鍊锁鎖错錯键鍵长長门門闪閃闭閉问問闲閒间間闸閘阀閥阶階陈陳险險难難顺順须須顾顧领領饭飯黄黃龄齡';
const MAP = {};
for (let i = 0; i < PAIRS.length; i += 2) MAP[PAIRS[i]] = PAIRS[i + 1];
const FIX = [['頭發', '頭髮'], ['游客', '遊客'], ['泡面', '泡麵']];
export function toHant(s) {
  let o = '';
  for (const ch of s) o += MAP[ch] || ch;
  for (const [a, b] of FIX) o = o.replaceAll(a, b);
  return o;
}
