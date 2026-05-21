"""数据访问层：每日金句"""
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models import CollectedQuote, DailyQuote

# ---------------------------------------------------------------------------
# 预置语录（首次启动时写入，共 50 条）
# ---------------------------------------------------------------------------

_SEED_QUOTES: List[dict] = [
    {"content_zh": "千里之行，始于足下。", "content_en": "A journey of a thousand miles begins with a single step.", "author": "老子", "source": "《道德经》"},
    {"content_zh": "知之者不如好之者，好之者不如乐之者。", "content_en": "To know is not as good as to love; to love is not as good as to delight in.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "天将降大任于斯人也，必先苦其心志，劳其筋骨。", "content_en": "When Heaven is about to confer a great mission on any man, it first disciplines his mind with suffering.", "author": "孟子", "source": "《孟子》"},
    {"content_zh": "不积跬步，无以至千里；不积小流，无以成江海。", "content_en": "Without accumulating small steps, one cannot cover a thousand miles; without accumulating small streams, one cannot form a river.", "author": "荀子", "source": "《荀子》"},
    {"content_zh": "路漫漫其修远兮，吾将上下而求索。", "content_en": "The road ahead is long and I see no ending; yet high and low I'll search with my will unbending.", "author": "屈原", "source": "《离骚》"},
    {"content_zh": "人生若只如初见，何事秋风悲画扇。", "content_en": "If life were like that first glance, why would the autumn wind make the painted fan grieve?", "author": "纳兰性德", "source": "《木兰词·拟古决绝词柬友》"},
    {"content_zh": "海内存知己，天涯若比邻。", "content_en": "A bosom friend afar brings a distant land near.", "author": "王勃", "source": "《送杜少府之任蜀州》"},
    {"content_zh": "山重水复疑无路，柳暗花明又一村。", "content_en": "When mountains and rivers seem to block all paths, beyond the willows and flowers lies another village.", "author": "陆游", "source": "《游山西村》"},
    {"content_zh": "长风破浪会有时，直挂云帆济沧海。", "content_en": "There will come a day when I ride the wind and cleave the waves, setting my sail straight to cross the vast sea.", "author": "李白", "source": "《行路难》"},
    {"content_zh": "会当凌绝顶，一览众山小。", "content_en": "I must scale its topmost peak, and behold all other mountains in one glance.", "author": "杜甫", "source": "《望岳》"},
    {"content_zh": "生当作人杰，死亦为鬼雄。", "content_en": "In life be a hero; in death be a hero still.", "author": "李清照", "source": "《夏日绝句》"},
    {"content_zh": "莫等闲，白了少年头，空悲切。", "content_en": "Lest youth slip away, and you grieve over white hair in vain.", "author": "岳飞", "source": "《满江红》"},
    {"content_zh": "人生自古谁无死，留取丹心照汗青。", "content_en": "Since ancient times, no one has been immortal; let my loyal heart shine in history.", "author": "文天祥", "source": "《过零丁洋》"},
    {"content_zh": "先天下之忧而忧，后天下之乐而乐。", "content_en": "Be first to worry for the world's troubles, and last to enjoy its pleasures.", "author": "范仲淹", "source": "《岳阳楼记》"},
    {"content_zh": "落红不是无情物，化作春泥更护花。", "content_en": "Fallen petals are not heartless things; they turn to spring mud to nurture flowers.", "author": "龚自珍", "source": "《己亥杂诗》"},
    {"content_zh": "只要功夫深，铁杵磨成针。", "content_en": "With enough effort, even an iron rod can be ground into a needle.", "author": "民间谚语", "source": None},
    {"content_zh": "读书破万卷，下笔如有神。", "content_en": "Read ten thousand volumes and your writing will be inspired.", "author": "杜甫", "source": "《奉赠韦左丞丈二十二韵》"},
    {"content_zh": "业精于勤荒于嬉，行成于思毁于随。", "content_en": "Mastery comes from diligence, idleness leads to ruin; success comes from thought, failure from carelessness.", "author": "韩愈", "source": "《进学解》"},
    {"content_zh": "宝剑锋从磨砺出，梅花香自苦寒来。", "content_en": "A sharp sword is born from grinding; the plum's fragrance comes from enduring bitter cold.", "author": "古语", "source": None},
    {"content_zh": "少壮不努力，老大徒伤悲。", "content_en": "If you do not work hard in youth, you will regret it in old age.", "author": "汉乐府", "source": "《长歌行》"},
    {"content_zh": "黑发不知勤学早，白首方悔读书迟。", "content_en": "With black hair you do not study early enough; with white hair you regret that reading comes too late.", "author": "颜真卿", "source": "《劝学》"},
    {"content_zh": "纸上得来终觉浅，绝知此事要躬行。", "content_en": "What you learn from books is always shallow; to truly understand, you must put it into practice.", "author": "陆游", "source": "《冬夜读书示子聿》"},
    {"content_zh": "问渠那得清如许？为有源头活水来。", "content_en": "Why is the canal so clear? Because a spring of living water feeds it.", "author": "朱熹", "source": "《观书有感》"},
    {"content_zh": "不飞则已，一飞冲天；不鸣则已，一鸣惊人。", "content_en": "Either it does not fly, or it soars to the sky; either it does not sing, or it startles the world.", "author": "司马迁", "source": "《史记》"},
    {"content_zh": "绳锯木断，水滴石穿。", "content_en": "A rope can saw through wood; water dripping can wear through stone.", "author": "罗大经", "source": "《鹤林玉露》"},
    {"content_zh": "天行健，君子以自强不息。", "content_en": "Heaven moves with strength; the noble one strives tirelessly for self-improvement.", "author": "《易经》", "source": "《周易》"},
    {"content_zh": "地势坤，君子以厚德载物。", "content_en": "Earth's nature is yielding; the noble one embraces all things with great virtue.", "author": "《易经》", "source": "《周易》"},
    {"content_zh": "君子坦荡荡，小人长戚戚。", "content_en": "The noble person is broad-minded and at ease; the petty person is always worried.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "三人行，必有我师焉。", "content_en": "When three people walk together, one of them is bound to be my teacher.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "吾日三省吾身。", "content_en": "I daily examine myself on three points.", "author": "曾子", "source": "《论语》"},
    {"content_zh": "己所不欲，勿施于人。", "content_en": "Do not impose on others what you yourself do not want.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "学而不思则罔，思而不学则殆。", "content_en": "Learning without thought is labor lost; thought without learning is perilous.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "知者不惑，仁者不忧，勇者不惧。", "content_en": "The wise have no doubts, the benevolent have no worries, the courageous have no fears.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "温故而知新，可以为师矣。", "content_en": "He who reviews the old and learns the new may be a teacher of others.", "author": "孔子", "source": "《论语》"},
    {"content_zh": "生活不止眼前的苟且，还有诗和远方。", "content_en": "Life is not just about the drudgery at hand; there is also poetry and the distant horizon.", "author": "高晓松", "source": None},
    {"content_zh": "愿你出走半生，归来仍是少年。", "content_en": "May you travel half your life and return still young at heart.", "author": "现代语录", "source": None},
    {"content_zh": "人间烟火气，最抚凡人心。", "content_en": "The warmth of everyday life soothes the hearts of ordinary people.", "author": "现代语录", "source": None},
    {"content_zh": "时间会告诉你，简单的喜欢，有多么了不起。", "content_en": "Time will show you how remarkable simple joy truly is.", "author": "现代语录", "source": None},
    {"content_zh": "你所经历的，都将成为你的一部分。", "content_en": "Everything you have lived through will become a part of you.", "author": "现代语录", "source": None},
    {"content_zh": "愿你有好运气，如果没有，愿你在磨难中学会慈悲。", "content_en": "May you have good fortune; if not, may you learn compassion through hardship.", "author": "现代语录", "source": None},
    {"content_zh": "每一个不曾起舞的日子，都是对生命的辜负。", "content_en": "Every day you do not dance is a day wasted.", "author": "尼采", "source": None},
    {"content_zh": "凡是过去，皆为序章。", "content_en": "What's past is prologue.", "author": "莎士比亚", "source": "《暴风雨》"},
    {"content_zh": "人最终活的，是一种心情。", "content_en": "In the end, what you live with is a state of mind.", "author": "现代语录", "source": None},
    {"content_zh": "我们都是赶路人，请保持善良。", "content_en": "We are all travelers in a hurry; please stay kind.", "author": "现代语录", "source": None},
    {"content_zh": "春有百花秋有月，夏有凉风冬有雪。若无闲事挂心头，便是人间好时节。", "content_en": "Spring brings a hundred flowers, autumn brings the moon; summer brings cool breezes, winter brings snow. With no idle worries in your heart, every season is good.", "author": "无门慧开", "source": "《无门关》"},
    {"content_zh": "此心安处是吾乡。", "content_en": "Wherever this heart is at peace, that is my home.", "author": "苏轼", "source": "《定风波·南海归赠王定国侍人寓娘》"},
    {"content_zh": "也无风雨也无晴。", "content_en": "No storm, nor sunshine — just serenity.", "author": "苏轼", "source": "《定风波》"},
    {"content_zh": "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", "content_en": "A bamboo staff and straw sandals are lighter than a horse; who fears? A raincoat through the mist — that is my life.", "author": "苏轼", "source": "《定风波》"},
    {"content_zh": "人生如逆旅，我亦是行人。", "content_en": "Life is a journey against the current; I too am a traveler passing through.", "author": "苏轼", "source": "《临江仙·送钱穆父》"},
    {"content_zh": "一花一世界，一叶一菩提。", "content_en": "In one flower there is a world; in one leaf there is enlightenment.", "author": "佛教禅语", "source": None},
]


# ---------------------------------------------------------------------------
# 初始化预置数据
# ---------------------------------------------------------------------------

async def seed_initial_quotes(db: AsyncSession) -> None:
    """若词库为空，则写入预置语录。"""
    count = await get_total_count(db)
    if count > 0:
        return
    for q in _SEED_QUOTES:
        quote = DailyQuote(
            content_zh=q["content_zh"],
            content_en=q["content_en"],
            author=q.get("author"),
            source=q.get("source"),
            is_ai_generated=False,
        )
        db.add(quote)
    await db.commit()


# ---------------------------------------------------------------------------
# 查询
# ---------------------------------------------------------------------------

async def get_total_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(DailyQuote))
    return result.scalar_one()


async def get_today_quote(db: AsyncSession) -> Optional[DailyQuote]:
    """按日期确定性轮换：index = (today - epoch) % pool_size，不写 DB。"""
    count = await get_total_count(db)
    if count == 0:
        return None
    epoch = date(2024, 1, 1)
    idx = (date.today() - epoch).days % count
    result = await db.execute(
        select(DailyQuote).order_by(DailyQuote.id.asc()).offset(idx).limit(1)
    )
    return result.scalar_one_or_none()


async def get_quote_by_id(db: AsyncSession, quote_id: int) -> Optional[DailyQuote]:
    result = await db.execute(select(DailyQuote).where(DailyQuote.id == quote_id))
    return result.scalar_one_or_none()


async def is_collected(db: AsyncSession, user_id: uuid.UUID, quote_id: int) -> bool:
    result = await db.execute(
        select(CollectedQuote).where(
            CollectedQuote.user_id == user_id,
            CollectedQuote.quote_id == quote_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_user_collection(
    db: AsyncSession, user_id: uuid.UUID
) -> List[Tuple[CollectedQuote, DailyQuote]]:
    result = await db.execute(
        select(CollectedQuote, DailyQuote)
        .join(DailyQuote, CollectedQuote.quote_id == DailyQuote.id)
        .where(CollectedQuote.user_id == user_id)
        .order_by(CollectedQuote.collected_at.desc())
    )
    return list(result.all())


# ---------------------------------------------------------------------------
# 写入
# ---------------------------------------------------------------------------

async def collect_quote(
    db: AsyncSession, user_id: uuid.UUID, quote_id: int
) -> Tuple[Optional[CollectedQuote], bool]:
    """幂等收藏：返回 (CollectedQuote, is_new)。"""
    existing = await db.execute(
        select(CollectedQuote).where(
            CollectedQuote.user_id == user_id,
            CollectedQuote.quote_id == quote_id,
        )
    )
    row = existing.scalar_one_or_none()
    if row is not None:
        return row, False

    new_record = CollectedQuote(
        user_id=user_id,
        quote_id=quote_id,
        collected_at=datetime.now(timezone.utc),
    )
    db.add(new_record)
    try:
        await db.commit()
        await db.refresh(new_record)
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(CollectedQuote).where(
                CollectedQuote.user_id == user_id,
                CollectedQuote.quote_id == quote_id,
            )
        )
        return result.scalar_one_or_none(), False
    return new_record, True


async def add_quote(
    db: AsyncSession,
    content_zh: str,
    content_en: str,
    author: Optional[str] = None,
    source: Optional[str] = None,
    is_ai_generated: bool = False,
) -> DailyQuote:
    quote = DailyQuote(
        content_zh=content_zh,
        content_en=content_en,
        author=author,
        source=source,
        is_ai_generated=is_ai_generated,
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote
