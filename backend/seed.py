"""Static reference data + idempotent seeding for development.
Jordan national hierarchy, book categories, clubs, achievements, admin, sample books."""
from bson import ObjectId
from db import db, now_iso
from auth import hash_password
import os

GOVERNORATES = [
    "عمّان", "إربد", "الزرقاء", "البلقاء", "الكرك", "معان",
    "العقبة", "عجلون", "جرش", "المفرق", "الطفيلة", "مادبا",
]

# governorate -> list of directorates · official MoE structure (42 directorates,
# moe.gov.jo navigation 2026-10). School lists come from data/jordan_schools.json.
DIRECTORATES = {
    "عمّان": ["لواء الجامعة", "لواء الجيزة", "لواء القويسمة", "لواء الموقر", "لواء سحاب", "لواء قصبة عمّان", "لواء ماركا", "لواء ناعور", "لواء وادي السير"],
    "إربد": ["الطيبة والوسطية", "لواء الأغوار الشمالية", "لواء الرمثا", "لواء الكورة", "لواء المزار الشمالي", "لواء بني عبيد", "لواء بني كنانة", "لواء قصبة إربد"],
    "الزرقاء": ["منطقة الرصيفة", "منطقة الزرقاء الأولى", "منطقة الزرقاء الثانية"],
    "البلقاء": ["قصبة السلط", "لواء دير علا", "لواء عين الباشا", "منطقة الشونة الجنوبية"],
    "الكرك": ["لواء الأغوار الجنوبية", "لواء المزار الجنوبي", "منطقة القصر", "منطقة الكرك"],
    "معان": ["قصبة معان", "لواء البتراء", "منطقة البادية الجنوبية", "منطقة الشوبك"],
    "العقبة": ["منطقة العقبة"],
    "عجلون": ["عجلون"],
    "جرش": ["جرش"],
    "المفرق": ["لواء قصبة المفرق", "منطقة البادية الشمالية الشرقية", "منطقة البادية الشمالية الغربية"],
    "الطفيلة": ["لواء بصيرا", "لواء قصبة الطفيلة"],
    "مادبا": ["لواء ذيبان", "لواء قصبة مادبا"],
}

# a few real-sounding schools per directorate (dev seed)
SCHOOL_NAMES = [
    "مدرسة الملك عبدالله الثاني للتميز", "مدرسة الحسين الثانوية الشاملة",
    "مدرسة اليوبيل", "مدرسة الأمير حسن الثانوية", "المدرسة النموذجية",
    "مدرسة الرشيد الثانوية", "مدرسة الفلاح الأساسية",
]

CATEGORIES = [
    {"slug": "science", "name": "علوم", "icon": "Atom", "color": "#2563EB"},
    {"slug": "culture", "name": "ثقافة", "icon": "Landmark", "color": "#059669"},
    {"slug": "religion", "name": "دين", "icon": "BookOpen", "color": "#0A192F"},
    {"slug": "history", "name": "تاريخ", "icon": "ScrollText", "color": "#D97706"},
    {"slug": "literature", "name": "أدب", "icon": "Feather", "color": "#E11D48"},
    {"slug": "novels", "name": "روايات", "icon": "Library", "color": "#7C3AED"},
    {"slug": "philosophy", "name": "فلسفة", "icon": "Brain", "color": "#0891B2"},
    {"slug": "programming", "name": "برمجة", "icon": "Code2", "color": "#1E293B"},
    {"slug": "ai", "name": "ذكاء اصطناعي", "icon": "Cpu", "color": "#2563EB"},
    {"slug": "economics", "name": "اقتصاد", "icon": "TrendingUp", "color": "#059669"},
    {"slug": "entrepreneurship", "name": "ريادة أعمال", "icon": "Rocket", "color": "#D97706"},
    {"slug": "self-dev", "name": "تطوير الذات", "icon": "Sparkles", "color": "#E11D48"},
    {"slug": "arts", "name": "فنون", "icon": "Palette", "color": "#7C3AED"},
    {"slug": "technology", "name": "تكنولوجيا", "icon": "Laptop", "color": "#0891B2"},
    {"slug": "general", "name": "معرفة عامة", "icon": "GraduationCap", "color": "#475569"},
]

CLUBS = [
    {"slug": "chess", "name": "نادي الشطرنج", "icon": "Crown", "color": "#0A192F",
     "description": "تحدَّ زملاءك في مباريات شطرنج حقيقية، وارتقِ في تصنيف ELO الوطني."},
    {"slug": "dialogue", "name": "نادي الحوار", "icon": "MessagesSquare", "color": "#2563EB",
     "description": "مساحة للنقاش المعرفي والثقافي والعلمي بين الطلاب والمعلمين."},
    {"slug": "programming", "name": "نادي البرمجة", "icon": "Code2", "color": "#1E293B",
     "description": "تحديات برمجية ومسائل خوارزمية بمستويات متدرجة ولوحة صدارة."},
    {"slug": "science", "name": "نادي العلوم", "icon": "Atom", "color": "#059669",
     "description": "مسابقات علمية، أسئلة، تحديات وتجارب تعليمية."},
    {"slug": "reading", "name": "نادي القراءة", "icon": "BookOpen", "color": "#D97706",
     "description": "تحديات قراءة، أهداف، سلاسل قراءة ومراجعات كتب."},
    {"slug": "innovation", "name": "نادي الابتكار", "icon": "Lightbulb", "color": "#E11D48",
     "description": "مشاريع وأفكار واختراعات طلابية وتشكيل فرق وتصويت."},
    {"slug": "debate", "name": "نادي المناظرات", "icon": "Scale", "color": "#7C3AED",
     "description": "مناظرات، فرق، جولات، حجج وتصويت وتقييم."},
    {"slug": "literature", "name": "نادي اللغة والأدب", "icon": "Feather", "color": "#0891B2",
     "description": "قصص، شعر، مقالات وكتابة إبداعية تُنشر بعد المراجعة."},
    {"slug": "entrepreneurship", "name": "نادي ريادة الأعمال", "icon": "Rocket", "color": "#059669",
     "description": "أفكار ومشاريع ناشئة وتحديات وعروض تقديمية."},
    {"slug": "ai", "name": "نادي الذكاء الاصطناعي", "icon": "Cpu", "color": "#2563EB",
     "description": "استكشف عالم الذكاء الاصطناعي عبر تحديات ومشاريع تطبيقية."},
    {"slug": "arts", "name": "نادي الفنون والإبداع", "icon": "Palette", "color": "#E11D48",
     "description": "فنون بصرية وإبداع رقمي ومعارض أعمال طلابية."},
]

ACHIEVEMENTS = [
    {"key": "first_book", "title": "أول كتاب", "description": "أكملت قراءة أول كتاب", "metric": "books_read", "threshold": 1, "badge": "قارئ", "icon": "BookOpen"},
    {"key": "bookworm", "title": "دودة الكتب", "description": "قرأت 5 كتب", "metric": "books_read", "threshold": 5, "badge": "قارئ نهم", "icon": "Library"},
    {"key": "scholar", "title": "باحث معرفي", "description": "قرأت 15 كتاب", "metric": "books_read", "threshold": 15, "badge": "باحث", "icon": "GraduationCap"},
    {"key": "first_post", "title": "أول مشاركة", "description": "شاركت في نادي الحوار", "metric": "posts", "threshold": 1, "badge": "محاور", "icon": "MessageSquare"},
    {"key": "active_debater", "title": "محاور متميز", "description": "20 مشاركة في الحوار", "metric": "posts", "threshold": 20, "badge": "محاور متميز", "icon": "MessagesSquare"},
    {"key": "chess_starter", "title": "بداية الشطرنج", "description": "أنهيت أول مباراة شطرنج", "metric": "chess_games", "threshold": 1, "badge": "لاعب شطرنج", "icon": "Crown"},
    {"key": "chess_master", "title": "خبير الشطرنج", "description": "فزت بـ 10 مباريات", "metric": "chess_wins", "threshold": 10, "badge": "أستاذ شطرنج", "icon": "Trophy"},
    {"key": "event_goer", "title": "مشارك فعّال", "description": "شاركت في أول فعالية", "metric": "events", "threshold": 1, "badge": "نشيط", "icon": "CalendarCheck"},
    {"key": "competitor", "title": "منافس", "description": "شاركت في أول مسابقة", "metric": "competitions", "threshold": 1, "badge": "منافس", "icon": "Medal"},
    {"key": "streak_7", "title": "أسبوع متواصل", "description": "حافظت على نشاطك 7 أيام", "metric": "max_streak", "threshold": 7, "badge": "مثابر", "icon": "Flame"},
    {"key": "level_5", "title": "مفكر ناشئ", "description": "وصلت للمستوى 5", "metric": "level", "threshold": 5, "badge": "مفكر ناشئ", "icon": "Star"},
    {"key": "xp_2000", "title": "جامع الخبرة", "description": "جمعت 2000 نقطة خبرة", "metric": "xp", "threshold": 2000, "badge": "خبير", "icon": "Sparkles"},
    {"key": "pages_100", "title": "مئة صفحة", "description": "قرأت 100 صفحة", "metric": "pages_read", "threshold": 100, "badge": "قارئ صفحات", "icon": "BookOpen"},
    {"key": "pages_500", "title": "خمسمئة صفحة", "description": "قرأت 500 صفحة", "metric": "pages_read", "threshold": 500, "badge": "قارئ مثابر", "icon": "Library"},
    {"key": "pages_1000", "title": "ألف صفحة", "description": "قرأت 1000 صفحة", "metric": "pages_read", "threshold": 1000, "badge": "قارئ نهم", "icon": "GraduationCap"},
    {"key": "pages_5000", "title": "مكتبة متنقلة", "description": "قرأت 5000 صفحة", "metric": "pages_read", "threshold": 5000, "badge": "مكتبة متنقلة", "icon": "Rocket"},
    {"key": "books_30", "title": "قارئ أسطوري", "description": "أكملت قراءة 30 كتاباً", "metric": "books_read", "threshold": 30, "badge": "أسطورة القراءة", "icon": "Crown"},
    {"key": "chess_first_win", "title": "أول انتصار", "description": "فزت بأول مباراة شطرنج", "metric": "chess_wins", "threshold": 1, "badge": "منتصر", "icon": "Zap"},
    {"key": "chess_tactician", "title": "تكتيكي", "description": "فزت بـ 5 مباريات شطرنج", "metric": "chess_wins", "threshold": 5, "badge": "تكتيكي", "icon": "Target"},
    {"key": "chess_champion", "title": "بطل الحلبة", "description": "فزت بـ 25 مباراة شطرنج", "metric": "chess_wins", "threshold": 25, "badge": "بطل الحلبة", "icon": "Crown"},
    {"key": "chess_veteran", "title": "محارب الرقعة", "description": "لعبت 25 مباراة شطرنج", "metric": "chess_games", "threshold": 25, "badge": "محارب الرقعة", "icon": "Medal"},
    {"key": "streak_30", "title": "شهر متواصل", "description": "حافظت على نشاطك 30 يوماً", "metric": "max_streak", "threshold": 30, "badge": "لا يُقهر", "icon": "Flame"},
    {"key": "level_10", "title": "مفكر راسخ", "description": "وصلت للمستوى 10", "metric": "level", "threshold": 10, "badge": "مفكر راسخ", "icon": "Star"},
    {"key": "xp_10000", "title": "أسطورة النقاط", "description": "جمعت 10000 نقطة خبرة", "metric": "xp", "threshold": 10000, "badge": "أسطورة", "icon": "Trophy"},
]

# شارات المهارات · اعتمادات مصغّرة يمنحها المشرفون يدوياً
SKILL_BADGES = [
    {"key": "public_speaker", "name": "خطيب مفوّه", "description": "مهارة الخطابة والإلقاء أمام الجمهور", "criteria": "إلقاء مميز في فعالية أو مسابقة خطابية", "icon": "Mic", "color": "#DC2626", "order": 1},
    {"key": "creative_writer", "name": "كاتب مبدع", "description": "مهارة الكتابة الإبداعية والأدبية", "criteria": "نشر 3 أعمال أدبية مميزة في الاستوديو", "icon": "PenLine", "color": "#7C3AED", "order": 2},
    {"key": "rising_writer", "name": "كاتب صاعد", "description": "أول عمل منشور في استوديو النشر", "criteria": "نشر أول عمل في الاستوديو (تُمنح تلقائياً)", "icon": "Feather", "color": "#059669", "order": 3},
    {"key": "leader", "name": "قائد ملهم", "description": "مهارات القيادة وإدارة الفرق", "criteria": "قيادة فريق أو مبادرة طلابية بنجاح", "icon": "Flag", "color": "#D97706", "order": 4},
    {"key": "critical_thinker", "name": "مفكر ناقد", "description": "التفكير الناقد والتحليل العميق", "criteria": "مشاركات تحليلية مميزة في الحوارات والمناظرات", "icon": "Brain", "color": "#2563EB", "order": 5},
    {"key": "innovator", "name": "مبتكر", "description": "الابتكار والحلول الإبداعية", "criteria": "مشروع أو فكرة مبتكرة ضمن مبادرات النادي", "icon": "Lightbulb", "color": "#EA580C", "order": 6},
    {"key": "volunteer", "name": "متطوع معطاء", "description": "العمل التطوعي وخدمة المجتمع", "criteria": "مشاركة فعالة في أنشطة تطوعية", "icon": "HeartHandshake", "color": "#E11D48", "order": 7},
    {"key": "tech_pioneer", "name": "رائد تقني", "description": "المهارات الرقمية والذكاء الاصطناعي", "criteria": "مشروع برمجي أو استخدام مميز للذكاء الاصطناعي", "icon": "Cpu", "color": "#0891B2", "order": 8},
    {"key": "reading-champion", "name": "بطل القراءة", "description": "إكمال تحدّي قراءة بنجاح", "criteria": "إكمال أي تحدّي قراءة (تُمنح تلقائياً)", "icon": "BookOpen", "color": "#B45309", "order": 9},
]

POINTS_CONFIG = {
    "read_book": 50, "review_book": 20, "create_discussion": 15,
    "reply_discussion": 8, "receive_like": 3, "join_event": 25,
    "win_chess": 30, "play_chess": 10, "daily_checkin": 5,
    "join_competition": 20, "win_competition": 100, "upload_book_approved": 40,
    "work_published": 60, "studio_review": 10, "venture_publish": 20,
    "venture_vote_received": 3, "venture_complete_owner": 30, "venture_complete_member": 15,
}

_COVERS = [
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
    "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&q=80",
    "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80",
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80",
]
_PDF1 = "https://css4.pub/2015/textbook/somatosensory.pdf"
_PDF2 = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

SAMPLE_BOOKS = [
    {"title": "مقدمة في الذكاء الاصطناعي", "author": "د. أحمد الخطيب", "category": "ai",
     "description": "رحلة مبسطة إلى عالم الذكاء الاصطناعي وتطبيقاته الحديثة وأثره على المستقبل.", "pages": 210, "year": 2023, "age": "15+"},
    {"title": "أساسيات البرمجة بلغة بايثون", "author": "م. سارة العمري", "category": "programming",
     "description": "دليل عملي لتعلم البرمجة من الصفر مع تمارين وتطبيقات واقعية.", "pages": 320, "year": 2022, "age": "13+"},
    {"title": "تاريخ الأردن الحديث", "author": "د. محمد الشريدة", "category": "history",
     "description": "قراءة موثقة في تاريخ المملكة الأردنية الهاشمية ومسيرة بنائها.", "pages": 280, "year": 2021, "age": "12+"},
    {"title": "فن التفكير العلمي", "author": "د. ليلى القاسم", "category": "science",
     "description": "كيف نفكر كالعلماء؟ منهجية البحث والتجربة والاستنتاج.", "pages": 190, "year": 2023, "age": "14+"},
    {"title": "عقول ريادية", "author": "خالد المومني", "category": "entrepreneurship",
     "description": "قصص ملهمة ودروس عملية في بناء المشاريع الناشئة وريادة الأعمال.", "pages": 240, "year": 2022, "age": "15+"},
    {"title": "في رحاب الفلسفة", "author": "د. رنا حدّاد", "category": "philosophy",
     "description": "مدخل إلى أهم الأسئلة الفلسفية عبر التاريخ بأسلوب مبسّط.", "pages": 260, "year": 2020, "age": "16+"},
    {"title": "أسرار الكون", "author": "د. يوسف النجار", "category": "science",
     "description": "جولة في الفيزياء الفلكية من الذرّة إلى المجرّات.", "pages": 300, "year": 2023, "age": "13+"},
    {"title": "بلاغة الكلمة", "author": "أ. هالة زيدان", "category": "literature",
     "description": "مختارات أدبية وتحليل لجماليات اللغة العربية.", "pages": 175, "year": 2021, "age": "12+"},
    {"title": "اقتصاد بلا تعقيد", "author": "د. سامي درويش", "category": "economics",
     "description": "المفاهيم الاقتصادية الأساسية التي يحتاجها كل شاب.", "pages": 220, "year": 2022, "age": "15+"},
    {"title": "عادات العقل الناجح", "author": "منى الصمادي", "category": "self-dev",
     "description": "استراتيجيات عملية لبناء عادات إيجابية وتطوير الذات.", "pages": 200, "year": 2023, "age": "14+"},
    {"title": "حكايات من التراث", "author": "أ. عمر الطراونة", "category": "culture",
     "description": "قصص شعبية أردنية وعربية تحمل قيماً وحكماً خالدة.", "pages": 160, "year": 2019, "age": "10+"},
    {"title": "الرواية الأولى", "author": "ديمة الفاعوري", "category": "novels",
     "description": "رواية شبابية عن الحلم والإصرار وصناعة المستقبل.", "pages": 340, "year": 2023, "age": "14+"},
]


async def _dedupe_geo():
    """One-time cleanup: early seeds could race on concurrent cold starts and insert
    duplicate governorates/directorates/schools (each governorate showing twice in
    the signup dropdown). Collapse duplicates by name, re-pointing children and
    users to the surviving (earliest) record."""
    # governorates
    keep = {}
    async for g in db.governorates.find({}).sort("created_at", 1):
        gid = str(g["_id"])
        if g["name"] in keep:
            kgid = keep[g["name"]]
            await db.directorates.update_many({"governorate_id": gid}, {"$set": {"governorate_id": kgid}})
            await db.schools.update_many({"governorate_id": gid}, {"$set": {"governorate_id": kgid}})
            await db.users.update_many({"governorate_id": gid}, {"$set": {"governorate_id": kgid, "governorate_name": g["name"]}})
            await db.governorates.delete_one({"_id": g["_id"]})
        else:
            keep[g["name"]] = gid
    # directorates
    keep_d = {}
    async for d in db.directorates.find({}).sort("created_at", 1):
        did = str(d["_id"])
        key = (d.get("governorate_id"), d["name"])
        if key in keep_d:
            kd = keep_d[key]
            await db.schools.update_many({"directorate_id": did}, {"$set": {
                "directorate_id": str(kd["_id"]), "directorate_name": kd["name"]}})
            await db.users.update_many({"directorate_id": did}, {"$set": {
                "directorate_id": str(kd["_id"]), "directorate_name": kd["name"]}})
            await db.directorates.delete_one({"_id": d["_id"]})
        else:
            keep_d[key] = d
    # schools
    keep_s = {}
    async for s in db.schools.find({}).sort("created_at", 1):
        sid = str(s["_id"])
        key = (s.get("directorate_id"), s["name"])
        if key in keep_s:
            ks = keep_s[key]
            await db.users.update_many({"school_id": sid}, {"$set": {
                "school_id": str(ks["_id"]), "school_name": ks["name"],
                "directorate_id": ks["directorate_id"], "directorate_name": ks["directorate_name"],
                "governorate_id": ks["governorate_id"], "governorate_name": ks["governorate_name"]}})
            await db.schools.delete_one({"_id": s["_id"]})
        else:
            keep_s[key] = s


async def seed_all():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.xp_transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.books.create_index([("status", 1), ("category", 1)])
    await db.user_quests.create_index([("user_id", 1), ("date", 1)], unique=True)
    await db.activity_events.create_index([("created_at", -1)])
    await db.follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
    await db.book_comments.create_index([("book_id", 1), ("created_at", -1)])
    await db.works.create_index([("status", 1), ("likes", -1)])
    await db.chess_games.create_index([("white_id", 1), ("updated_at", -1)])
    await db.chess_games.create_index([("black_id", 1), ("updated_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.reports.create_index([("status", 1), ("created_at", -1)])

    # categories
    for c in CATEGORIES:
        await db.categories.update_one({"slug": c["slug"]}, {"$set": c}, upsert=True)

    # clubs
    for c in CLUBS:
        await db.clubs.update_one({"slug": c["slug"]},
            {"$setOnInsert": {**c, "members_count": 0, "created_at": now_iso()}}, upsert=True)

    # achievements
    for a in ACHIEVEMENTS:
        await db.achievements.update_one({"key": a["key"]}, {"$set": a}, upsert=True)

    # skill badges
    for b in SKILL_BADGES:
        await db.skill_badges.update_one({"key": b["key"]}, {"$set": b}, upsert=True)

    # points config (CMS-editable)
    await db.settings.update_one({"key": "points_config"},
        {"$setOnInsert": {"key": "points_config", "value": POINTS_CONFIG}}, upsert=True)

    # CMS landing content
    await db.settings.update_one({"key": "landing_cms"}, {"$setOnInsert": {
        "key": "landing_cms",
        "value": {
            "about": "نحن مجموعة ونخبة من طلبة المدارس المبدعين والرياديين والمفكرين نقدياً والباحثين عن الخير والحقيقة والجمال لتطوير مجتمعنا ووطننا وأمتنا والإنسانية جمعاء.\n\nوذلك من خلال التشبيك مع شباب المدارس الأخرى على مستوى المديرية قصبة إربد الأولى ومدارس المملكة الأردنية الهاشمية للقيام بنشاطات فكرية وثقافية، تخدم رؤية وزارة التربية والتعليم وتسعى لإنشاء جيل منتمي لوطنه وقيادته ويسعى لخدمة وطنه ومجتمعه وأمته تربوياً وعلمياً وثقافياً وإنسانياً.\n\nوذلك تحقيقاً لرؤى جلالة الملك عبدالله الثاني بن الحسين حفظه اللّٰه ورعاه ولولي عهده الأمين الأمير الحسين بن عبدالله الثاني وفقه الله.\n\nينطلق المشروع بدايةً من نخبة طلبة مدرسة الملك الحسين بن طلال الثانوية للبنين بإشراف المعلم والأستاذ: عمار غزلان",
            "vision": "يسعى نادي مفكري المستقبل لتكون المنصة الأولى محلياً على مستوى المملكة الأردنية الهاشمية وعربياً وعالمياً خلال الخمس سنوات القادمة لتصبح جسراً ثقافياً وإنسانياً وثيقاً للتواصل والتعارف وتبادل الخبرات والتجارب الذاتية والتشبيك والدعم بين الطلبة ونقل خبراتهم وثقافتهم لبعضهم البعض عبر الحوار والتواصل والفعاليات، ونسعى لتخريج مفكرين رياديين ومبدعين مميزين عربياً وعالمياً كسفراء لوطنهم الأردن والمتابعة مع الطلبة من خلال منتدى ثقافي يجمعهم في الجامعات أيضاً ليبقوا سفراء للنادي ونقل تجربتهم لطلبة المدارس اللاحقين من بعدهم.",
            "mission": "تهدف رسالتنا في نادي مفكري المستقبل إلى بناء ثقافة جيل كامل من الأجيال الصاعدة متسلحة بالوعي والمعرفة والإيمان والمهارات الحياتية والناعمة والتفكير الناقد بقيم وطنية أصيلة وتطوير جميع الأدوات المهارية التي تصنع منه جيلاً مبدعاً ومميزاً من خلال أنشطتنا ومنصتنا الرقمية.",
            "goals": [
                "تشبيك الطلبة بين بعضهم البعض وتعزيز مهارات الحوار والتواصل",
                "تعزيز قيمة الكتاب والمعرفة والعلم في حياتهم",
                "تطوير المهارات الناعمة والشخصية ليكونوا مستعدين لسوق العمل",
                "تأسيس منصة رقمية مميزة للطلبة لها دومين خاص بنا على مستوى المملكة والإقليم",
                "تشبيك طرق التواصل من خلال التبادل الثقافي بين الدول والقارات ونقل التجربة العربية والأردنية للعالم",
                "تأسيس مجموعة من المشاريع والنوادي الريادية والمبادرات ضمن مظلة نادي مفكري المستقبل والعمل عليها بشكل دائم وفعال",
                "تعزيز قيم الريادة والابتكار والإبداع والرقمنة والذكاء الاصطناعي من خلال منصة نادي مفكري المستقبل الموقع الإلكتروني"
            ],
            "activities": [
                {
                    "title": "نادي المفكر الصغير",
                    "description": "نادي طلابي يتكون من فريق ثقافي لتفعيل دور المكتبة في المدارس وتطوير مهارات الطلاب معرفياً وتوسيع آفاقهم من خلال ربطهم بالكتاب والمكتبة وتفعيل برامج استعارة الكتب ونقاشيات للكتب بشكل شبه دوري، وعمل نشاط ماراثون للقراءة بالتعاون مع مؤسسة عبد الحميد شومان ومبادرة كلنا نقرأ في إربد وعمل معرض لشراء الكتب والتسوق المعرفي.",
                    "icon": "BookOpen",
                    "color": "#D97706"
                },
                {
                    "title": "نادي الإعلامي الصغير",
                    "description": "نادي مصغر للمهتمين بالإعلام ممن لديهم قدرات في الخطابة والتحدث والإلقاء، موظفاً الخبرة في الإذاعة المحلية هلا إربد لمدة ثلاث سنوات كمدير فريق إعداد وكمذيع، بالتشبيك مع برنامج الاستوديو التعليمي من برامج التميز لتطوير مهارات التحدث والإلقاء أمام الجمهور وكذلك تطوير مهارات الاتصال والتواصل والتعامل مع الكاميرا والمايكروفون، ومن خلال اكتشاف الطلبة ومواهبهم في ذلك من أنشطة الإذاعة المدرسية المكلف بها منذ سنوات وبالتعاون مع المرشد التربوي وفريق الطلبة الإعلامي.",
                    "icon": "Mic",
                    "color": "#2563EB"
                },
                {
                    "title": "نادي الشطرنج",
                    "description": "نادي شبابي للشباب المهتمين بلعبة الشطرنج من الصف العاشر حتى الأول الأكاديمي والبتيك، حيث سنقوم بالتشارك مع كوتش شطرنج بعمل ورشة تدريبية للعبة الشطرنج والخطط وأصول وقواعد اللعبة.",
                    "icon": "Crown",
                    "color": "#0A192F"
                }
            ]
        }}}, upsert=True)

    # national hierarchy · dedupe FIRST (existing duplicate rows would make
    # unique-index creation fail), then unique indexes, then idempotent
    # name-keyed upserts (a plain count-check races under concurrent cold
    # starts and inserts every governorate twice)
    await _dedupe_geo()
    await db.governorates.create_index("name", unique=True)
    await db.directorates.create_index([("governorate_id", 1), ("name", 1)], unique=True)
    await db.schools.create_index([("directorate_id", 1), ("name", 1)], unique=True)
    # real Jordan school lists scraped from moe.gov.jo (per-directorate pages)
    school_data = {}
    try:
        import json as _json
        _dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "schools")
        for _fn in sorted(os.listdir(_dir)):
            if not _fn.endswith(".json"):
                continue
            with open(os.path.join(_dir, _fn), encoding="utf8") as _fh:
                for _d in _json.load(_fh).get("directorates", []):
                    school_data[_d["name"]] = _d.get("schools", [])
    except Exception:
        school_data = {}

    # one-time cleanup of the old dev placeholder schools (only rows the old
    # seed itself created: "SCHOOL_NAME - directorate" with no national_id and
    # no user pointing at them) so real lists replace the fake ones in pickers
    if school_data:
        try:
            _referenced = set(await db.users.distinct("school_id"))
            async for _s in db.schools.find({"national_id": {"$exists": False}}):
                _base = _s.get("name", "").split(" - ")[0]
                if _base in SCHOOL_NAMES and str(_s["_id"]) not in _referenced:
                    await db.schools.delete_one({"_id": _s["_id"]})
        except Exception:
            pass

    for gname in GOVERNORATES:
        g = await db.governorates.find_one_and_update(
            {"name": gname},
            {"$setOnInsert": {"name": gname, "created_at": now_iso()}},
            upsert=True, return_document=True)
        gid = str(g["_id"])
        for dname in DIRECTORATES.get(gname, [f"مديرية {gname}"]):
            d = await db.directorates.find_one_and_update(
                {"governorate_id": gid, "name": dname},
                {"$setOnInsert": {"name": dname, "governorate_id": gid,
                                  "governorate_name": gname, "created_at": now_iso()}},
                upsert=True, return_document=True)
            did = str(d["_id"])
            real = school_data.get(dname)
            if real is not None:
                for sch in real:
                    await db.schools.update_one(
                        {"directorate_id": did, "name": sch["name"]},
                        {"$setOnInsert": {
                            "name": sch["name"],
                            "national_id": sch.get("national_id", ""),
                            "sector": sch.get("sector", "حكومية"),
                            "gender": sch.get("gender", "مختلطة"),
                            "directorate_id": did, "directorate_name": dname,
                            "governorate_id": gid, "governorate_name": gname,
                            "students_count": 0, "created_at": now_iso()}},
                        upsert=True)
            else:
                for sname in SCHOOL_NAMES[:4]:
                    s_full = f"{sname} - {dname.replace('مديرية ', '')}"
                    await db.schools.update_one(
                        {"directorate_id": did, "name": s_full},
                        {"$setOnInsert": {
                            "name": s_full,
                            "directorate_id": did, "directorate_name": dname,
                            "governorate_id": gid, "governorate_name": gname,
                            "students_count": 0, "created_at": now_iso()}},
                        upsert=True)

    # one-time merge: collapse pre-official directorate names (e.g. "مديرية
    # إربد الأولى") into the official 42 when they share a distinctive name
    # token within the same governorate · re-points schools and users first,
    # mirroring _dedupe_geo; unmatched legacy rows are left untouched
    try:
        _STOP = {"مديرية", "لواء", "منطقة", "قصبة", "الأولى", "الثانية", "الاولى"}
        def _tokens(name):
            return {t for t in str(name).replace("ـ", "").split() if t not in _STOP}
        _all_official = {d for ds in DIRECTORATES.values() for d in ds}
        async for _d in db.directorates.find({}):
            if _d["name"] in _all_official:
                continue
            _my = _tokens(_d["name"])
            _best, _score = None, 0
            async for _cand in db.directorates.find({"governorate_id": _d.get("governorate_id")}):
                if _cand["name"] not in _all_official:
                    continue
                _sc = len(_my & _tokens(_cand["name"]))
                if _sc > _score:
                    _best, _score = _cand, _sc
            if _best is None or _score == 0:
                # safe fallback: the governorate has exactly one official
                # directorate (e.g. القويرة -> العقبة, كفرنجة -> عجلون)
                _same_gov = [c async for c in db.directorates.find(
                    {"governorate_id": _d.get("governorate_id")}) if c["name"] in _all_official]
                if len(_same_gov) != 1:
                    continue
                _best = _same_gov[0]
            await db.schools.update_many({"directorate_id": str(_d["_id"])}, {"$set": {
                "directorate_id": str(_best["_id"]), "directorate_name": _best["name"]}})
            await db.users.update_many({"directorate_id": str(_d["_id"])}, {"$set": {
                "directorate_id": str(_best["_id"]), "directorate_name": _best["name"]}})
            await db.directorates.delete_one({"_id": _d["_id"]})
    except Exception:
        pass

    # admin / owner account
    # NOTE: the env values are the source of truth. On every deploy the
    # seeded admin is synced to ADMIN_EMAIL/ADMIN_PASSWORD, so change the
    # admin password via the Vercel env vars, not only inside the app.
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@futurethinkers.jo")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        # the admin may have been seeded earlier under a different email
        existing = await db.users.find_one({"role": "super_admin"})
    if not existing:
        await db.users.insert_one({
            "name": "مسؤول المنصة", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "super_admin",
            "status": "active", "xp": 0, "level": 1, "level_title": "قارئ مبتدئ",
            "extra_permissions": [], "badges": [], "achievements": [], "stats": {},
            "streak": 0, "chess_rating": 1200, "created_at": now_iso(),
        })
    else:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"email": admin_email,
                      "password_hash": hash_password(admin_password),
                      "role": "super_admin", "status": "active"}},
        )

    # coding problems (نادي البرمجة)
    if await db.coding_problems.count_documents({}) == 0:
        problems = [
            {"title": "مجموع رقمين", "difficulty": 1, "xp": 20,
             "statement": "اقرأ سطراً يحتوي على عددين صحيحين مفصولين بمسافة، واطبع مجموعهما.",
             "tests": [{"input": "3 5\n", "output": "8"}, {"input": "10 -4\n", "output": "6"}, {"input": "0 0\n", "output": "0"}]},
            {"title": "أكبر عدد", "difficulty": 1, "xp": 25,
             "statement": "اقرأ عدد العناصر n في السطر الأول، ثم n أعداد في السطر الثاني، واطبع أكبرها.",
             "tests": [{"input": "3\n1 9 4\n", "output": "9"}, {"input": "5\n-2 -7 -1 -9 -3\n", "output": "-1"}]},
            {"title": "مضروب العدد", "difficulty": 2, "xp": 35,
             "statement": "اقرأ عدداً صحيحاً n (0 ≤ n ≤ 12) واطبع مضروبه n!.",
             "tests": [{"input": "5\n", "output": "120"}, {"input": "0\n", "output": "1"}, {"input": "7\n", "output": "5040"}]},
            {"title": "عدد أولي؟", "difficulty": 2, "xp": 40,
             "statement": "اقرأ عدداً صحيحاً n واطبع 'YES' إن كان أولياً وإلا 'NO'.",
             "tests": [{"input": "7\n", "output": "YES"}, {"input": "1\n", "output": "NO"}, {"input": "12\n", "output": "NO"}]},
        ]
        for p in problems:
            await db.coding_problems.insert_one({**p, "created_at": now_iso()})

    admin = await db.users.find_one({"email": admin_email})
    admin_id = str(admin["_id"]) if admin else None
    if await db.books.count_documents({}) == 0 and admin_id:
        for i, b in enumerate(SAMPLE_BOOKS):
            await db.books.insert_one({
                **b,
                "cover_url": _COVERS[i % len(_COVERS)],
                "external_pdf_url": _PDF1 if i % 2 == 0 else _PDF2,
                "storage_path": None, "cover_path": None,
                "language": "العربية", "publisher": "منصة مفكري المستقبل",
                "tags": [b["category"]], "status": "approved",
                "uploaded_by": admin_id, "approved_by": admin_id,
                "views": 0, "downloads": 0, "favorites_count": 0,
                "rating_avg": 0, "rating_count": 0,
                "created_at": now_iso(), "approved_at": now_iso(),
            })
