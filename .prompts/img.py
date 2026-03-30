from PIL import Image, ImageDraw, ImageFont
import os, textwrap, math, json

W, H = 1600, 2500
bg = (8, 8, 8)
panel_bg = (34, 34, 34)
border = (74, 74, 74)
muted = (190, 190, 190)
white = (245, 245, 245)
subtle = (120, 120, 120)
purple = (160, 142, 255)
green = (74, 214, 172)
beige = (219, 214, 198)
track = (60, 60, 60)

img = Image.new("RGB", (W, H), bg)
draw = ImageDraw.Draw(img)

def get_font(size, bold=False):
    # List of font paths to check in order of preference
    home_dir = os.path.expanduser("~")
    
    # Each entry is (bold_path, regular_path)
    font_options = [
        # LXGW WenKai
        (os.path.join(home_dir, ".local/share/fonts/LXGWWenKai-Bold.ttf"), 
         os.path.join(home_dir, ".local/share/fonts/LXGWWenKai-Regular.ttf")),
        ("/usr/share/fonts/lxgw-wenkai/LXGWWenKai-Bold.ttf",
         "/usr/share/fonts/lxgw-wenkai/LXGWWenKai-Regular.ttf"),
        # Source Han Sans SC
        (os.path.join(home_dir, ".local/share/fonts/SourceHanSansSC/SourceHanSansSC-Bold.otf"),
         os.path.join(home_dir, ".local/share/fonts/SourceHanSansSC/SourceHanSansSC-Regular.otf")),
        # Noto Sans CJK SC
        ("/usr/share/fonts/google-noto-sans-cjk-fonts/NotoSansCJK-Bold.ttc",
         "/usr/share/fonts/google-noto-sans-cjk-fonts/NotoSansCJK-Regular.ttc"),
        # WenQuanYi Micro Hei
        ("/usr/share/fonts/wqy-microhei-fonts/wqy-microhei.ttc",
         "/usr/share/fonts/wqy-microhei-fonts/wqy-microhei.ttc"),
    ]

    for b_path, r_path in font_options:
        p = b_path if bold else r_path
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size=size)
            except:
                pass
        # If bold was requested but doesn't exist, try regular version of same font
        if bold and os.path.exists(r_path):
            try:
                return ImageFont.truetype(r_path, size=size)
            except:
                pass

    return ImageFont.load_default()

font_title = get_font(24, bold=True)
font_big = get_font(34, bold=True)
font = get_font(22)
font_small = get_font(18)
font_tiny = get_font(16)
font_tag = get_font(22, bold=True)

def round_rect(xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def text(x, y, s, f=font, fill=white):
    draw.text((x, y), s, font=f, fill=fill)

def wrapped_text(x, y, s, width_chars, f=font_small, fill=muted, line_gap=6):
    lines = textwrap.wrap(s, width=width_chars)
    cur_y = y
    for line in lines:
        draw.text((x, cur_y), line, font=f, fill=fill)
        bbox = draw.textbbox((x, cur_y), line, font=f)
        cur_y += (bbox[3]-bbox[1]) + line_gap
    return cur_y

# Header model bands
margin = 28
top_h = 116
gap = 14
band_w = (W - margin*2 - gap*2) // 3

bands = [
    ("Opus / 最强", "架构设计-复杂推理", (215, 212, 228), (101, 92, 180)),
    ("Sonnet / 中档", "标准实现-逻辑推导", (220, 239, 234), (46, 128, 104)),
    ("Haiku / 轻量", "模板填充-重复工作", (231, 228, 220), (117, 107, 92)),
]
for i, (t1, t2, fill, tcolor) in enumerate(bands):
    x0 = margin + i*(band_w+gap)
    y0 = margin
    round_rect((x0, y0, x0+band_w, y0+top_h), 18, fill=fill)
    tw = draw.textbbox((0,0), t1, font=font_title)
    text(x0 + band_w/2 - (tw[2]-tw[0])/2, y0+18, t1, f=font_title, fill=tcolor)
    tw2 = draw.textbbox((0,0), t2, font=font)
    text(x0 + band_w/2 - (tw2[2]-tw2[0])/2, y0+60, t2, f=font, fill=tcolor)

# Summary
summary_y = top_h + margin + 18
text(margin, summary_y, "个人输入分析系统-V1（P0 + P1）开发拆分", f=font_big)
text(margin, summary_y+48, "总工程量-约 27~38 人日    并行 6~8 Agents-预计 8~12 个工作日完成主线可用版本", f=font_small, fill=(210,210,210))
text(margin, summary_y+78, "关键依赖-Agent 0 先定义契约；A/B/C/D/E 可并行；F 从中期介入；G 做集成与发布收口", f=font_small, fill=(170,170,170))

cards = [
    {
        "agent": "Agent 0-共享契约与骨架",
        "subtitle": "事件模型 / 分析口径 / API 协议 / 目录基线",
        "diff": 4.6, "effort": 3.5, "loc": "500~800", "time": "1.5~2.5 d",
        "tag": "Opus", "color": purple, "stars": 5,
        "desc": "全项目地基。统一“记录事件、会话、词频、报告、导出”口径，避免后续并行开发出现接口漂移。"
    },
    {
        "agent": "Agent A-输入采集与会话切分",
        "subtitle": "记录开关 / 明细采集 / 去噪 / 时段与会话划分",
        "diff": 4.2, "effort": 4.3, "loc": "800~1200", "time": "2.5~4 d",
        "tag": "Opus", "color": purple, "stars": 4,
        "desc": "采集层直接决定后续分析上限。需把“已上屏文本、时间、来源、会话边界、过滤规则”定义稳定。"
    },
    {
        "agent": "Agent B-统计分析引擎",
        "subtitle": "输入量 / 趋势 / 高频词 / 新词 / 词云 / 热力图",
        "diff": 4.4, "effort": 4.7, "loc": "1200~1800", "time": "3~5 d",
        "tag": "Opus", "color": purple, "stars": 5,
        "desc": "核心价值模块。覆盖日/周/月统计、高频词、冷热词、活跃时段、趋势摘要与报告摘要基础能力。"
    },
    {
        "agent": "Agent C-词库管理与迁移",
        "subtitle": "个人词库总览 / 清理 / 分类 / 导出 / 迁移助手",
        "diff": 3.7, "effort": 3.8, "loc": "700~1100", "time": "2~3.5 d",
        "tag": "Sonnet", "color": green, "stars": 4,
        "desc": "把分析结果转化为可管理资产。重点是高频词、新增词、低频陈旧词的筛选与导出体验。"
    },
    {
        "agent": "Agent D-Dashboard 与报告",
        "subtitle": "总览页 / 图表页 / 词云页 / 报告生成 / 导出",
        "diff": 4.0, "effort": 4.5, "loc": "1000~1600", "time": "3~5 d",
        "tag": "Sonnet", "color": green, "stars": 4,
        "desc": "用户感知最强模块。需要把复杂统计压缩成少量高可读组件，并支持日/周/月报告输出。"
    },
    {
        "agent": "Agent E-隐私与数据治理",
        "subtitle": "保留策略 / 删除 / 脱敏 / 忽略名单 / 设置中心",
        "diff": 3.6, "effort": 3.1, "loc": "600~900", "time": "1.5~2.5 d",
        "tag": "Sonnet", "color": green, "stars": 4,
        "desc": "信任层。需保证用户可知可控-哪些数据被记录、如何删除、如何仅保留统计不保留原文。"
    },
    {
        "agent": "Agent F-测试套件与验收数据",
        "subtitle": "单元测试 / 回归样例 / 基准数据 / 验收清单",
        "diff": 2.5, "effort": 4.0, "loc": "900~1400", "time": "2.5~4 d",
        "tag": "Haiku", "color": beige, "stars": 3,
        "desc": "高重复但必做。要把多种输入场景沉淀成可复跑样例，覆盖边界-空输入、重复输入、敏感过滤、导出。"
    },
    {
        "agent": "Agent G-集成、发布与演示",
        "subtitle": "端到端串联 / Demo 数据 / 打包 / 使用说明",
        "diff": 2.8, "effort": 3.0, "loc": "500~800", "time": "1.5~2.5 d",
        "tag": "Haiku", "color": beige, "stars": 3,
        "desc": "收口模块。把 A~F 接上主流程，确保“记录→分析→展示→导出”完整闭环可运行。"
    }
]

start_y = summary_y + 126
card_h = 255
card_gap = 20

def draw_bar(x, y, w, h, value, color):
    round_rect((x, y, x+w, y+h), h//2, fill=track)
    fillw = int(w * value / 5.0)
    round_rect((x, y, x+fillw, y+h), h//2, fill=color)

def draw_stars(x, y, stars, fill=(225,225,225)):
    s = "★"*stars + "☆"*(5-stars)
    draw.text((x, y), s, font=font_small, fill=fill)

for idx, c in enumerate(cards):
    y = start_y + idx*(card_h + card_gap)
    x = margin
    round_rect((x, y, W-margin, y+card_h), 18, fill=panel_bg, outline=border, width=2)
    text(x+22, y+16, c["agent"], f=font_title, fill=white)
    text(x+22, y+52, c["subtitle"], f=font_small, fill=muted)
    # tag
    tag_w, tag_h = 92, 34
    round_rect((W-margin-tag_w-18, y+18, W-margin-18, y+18+tag_h), 10, fill=(240,240,240))
    tw = draw.textbbox((0,0), c["tag"], font=font_tiny)
    text(W-margin-tag_w-18 + tag_w/2 - (tw[2]-tw[0])/2, y+24, c["tag"], f=font_tiny, fill=(70,70,70))
    # bars
    label_x = x+22
    bar_x = x+120
    bar_w = W - margin - 180 - bar_x
    text(label_x, y+88, "难度", f=font_small, fill=(210,210,210))
    draw_bar(bar_x, y+94, bar_w, 10, c["diff"], c["color"])
    draw_stars(W-margin-160, y+84, c["stars"])
    
    text(label_x, y+122, "工程量", f=font_small, fill=(210,210,210))
    draw_bar(bar_x, y+128, bar_w, 10, c["effort"], tuple(int(min(255, v*0.95+20)) for v in c["color"]))
    
    # info boxes
    box_y = y+158
    box_w = (W - margin*2 - 22*2 - 16) // 2
    for j, (title, val) in enumerate([("预计代码行数", c["loc"]), ("预计耗时", c["time"])]):
        bx = x+22 + j*(box_w+16)
        round_rect((bx, box_y, bx+box_w, box_y+58), 12, fill=(42,42,42))
        text(bx+16, box_y+8, title, f=font_tiny, fill=(180,180,180))
        text(bx+16, box_y+28, val, f=font_title, fill=white)
    wrapped_text(x+22, y+224, c["desc"], width_chars=80, f=font_small, fill=(185,185,185), line_gap=2)

# footer legend
footer_y = start_y + len(cards)*(card_h+card_gap) + 10
text(margin, footer_y, "并行建议", f=font_title)
legend = [
    "第 0 波-Agent 0 单独先行，冻结事件契约、页面字段与导出口径。",
    "第 1 波-Agent A / B / C / D / E 并行开发；D 使用 0 号契约与模拟数据，不等待全部后端完成。",
    "第 2 波-Agent F 介入回归与验收；同步补齐边界样例与测试数据。",
    "第 3 波-Agent G 收口集成、打包、演示数据与使用文档。",
    "扩展轨（P2）-主题画像、表达风格分析、长期兴趣变化，可另开 Opus Agent 独立推进。"
]
yy = footer_y + 38
for line in legend:
    text(margin+10, yy, "• " + line, f=font_small, fill=(215,215,215))
    yy += 34

out_path = "./docs/engineering_panel.png"
img.save(out_path)