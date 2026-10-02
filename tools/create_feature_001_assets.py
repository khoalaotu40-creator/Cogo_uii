from pathlib import Path
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = ROOT / 'output' / 'pdf'
OUT_UI = ROOT / 'output' / 'ui-ux'
SOURCE = ROOT / 'plan' / 'features' / '001-login-register.md'
FONT = 'C:/Windows/Fonts/arial.ttf'
FONT_BOLD = 'C:/Windows/Fonts/arialbd.ttf'

def ensure():
    OUT_PDF.mkdir(parents=True, exist_ok=True)
    OUT_UI.mkdir(parents=True, exist_ok=True)

def build_pdf():
    pdfmetrics.registerFont(TTFont('ArialVN', FONT))
    pdfmetrics.registerFont(TTFont('ArialVNBold', FONT_BOLD))
    styles = getSampleStyleSheet()
    body = ParagraphStyle('BodyVN', parent=styles['BodyText'], fontName='ArialVN', fontSize=9.2,
                          leading=14, textColor=colors.HexColor('#263238'), spaceAfter=5)
    code = ParagraphStyle('CodeVN', parent=body, fontName='ArialVN', fontSize=8.2, leading=12,
                          leftIndent=7, backColor=colors.HexColor('#F4F8F6'), borderPadding=7)
    h1 = ParagraphStyle('H1VN', parent=styles['Heading1'], fontName='ArialVNBold', fontSize=19,
                        leading=25, textColor=colors.HexColor('#0E4834'), spaceBefore=15, spaceAfter=10)
    h2 = ParagraphStyle('H2VN', parent=styles['Heading2'], fontName='ArialVNBold', fontSize=13,
                        leading=18, textColor=colors.HexColor('#0E4834'), spaceBefore=13, spaceAfter=7)
    title = ParagraphStyle('TitleVN', parent=styles['Title'], fontName='ArialVNBold', fontSize=27,
                           leading=34, textColor=colors.HexColor('#0E4834'), alignment=TA_CENTER)
    subtitle = ParagraphStyle('SubVN', parent=body, fontSize=11, leading=17, textColor=colors.HexColor('#527164'), alignment=TA_CENTER)
    raw = SOURCE.read_text(encoding='utf-8').replace('\r\n', '\n')
    lines = raw.split('\n')
    story = [Spacer(1, 42*mm), Paragraph('CoGo Feature Plan 001', title), Spacer(1, 6*mm),
             Paragraph('Login / Register / Student Verification', subtitle), Spacer(1, 15*mm),
             Paragraph('Tài liệu triển khai &amp; nghiệm thu', subtitle), Spacer(1, 35*mm),
             Paragraph('Phiên bản PDF được tạo từ plan/features/001-login-register.md', subtitle), PageBreak()]
    buffer = []
    in_code = False
    def flush():
        nonlocal buffer
        if buffer:
            text = ' '.join(buffer).strip()
            if text:
                if text.startswith('- '):
                    text = '• ' + text[2:]
                text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(text, body))
            buffer = []
    for line in lines:
        s = line.strip()
        if s.startswith('```'):
            flush(); in_code = not in_code; continue
        if in_code:
            if s:
                escaped = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace(' ', '&nbsp;')
                story.append(Paragraph(escaped, code))
            continue
        if not s or s == '---' or s == '>':
            flush(); story.append(Spacer(1, 2.3*mm)); continue
        heading = re.match(r'^(#{1,3})\s+(.*)$', s)
        if heading:
            flush(); level = len(heading.group(1)); text = heading.group(2)
            story.append(Paragraph(text, h1 if level == 1 else h2 if level == 2 else body)); continue
        if s.startswith('> '):
            flush(); story.append(Paragraph(s[2:].replace('**',''), ParagraphStyle('QuoteVN', parent=body, leftIndent=10, borderColor=colors.HexColor('#A5DFC5'), borderWidth=2, borderPadding=7))); continue
        if s.startswith('- '):
            flush(); story.append(Paragraph('• ' + s[2:].replace('**',''), body)); continue
        buffer.append(s.replace('**', ''))
    flush()
    def footer(canvas, doc):
        canvas.saveState(); canvas.setStrokeColor(colors.HexColor('#A5DFC5')); canvas.line(18*mm, 13*mm, 192*mm, 13*mm)
        canvas.setFont('ArialVN', 8); canvas.setFillColor(colors.HexColor('#527164'))
        canvas.drawString(18*mm, 8*mm, 'CoGo · Feature Plan 001'); canvas.drawRightString(192*mm, 8*mm, f'Trang {doc.page}')
        canvas.restoreState()
    SimpleDocTemplate(str(OUT_PDF/'cogo-feature-001-login-register.pdf'), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=17*mm, bottomMargin=19*mm, title='CoGo Feature Plan 001').build(story, onFirstPage=footer, onLaterPages=footer)

def font(size, bold=False): return ImageFont.truetype(FONT_BOLD if bold else FONT, size)
def rounded(d, box, r, fill, outline=None, width=1): d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)
def text(d, xy, value, size, color, bold=False): d.text(xy, value, font=font(size,bold), fill=color)
def input_box(d, y, label, placeholder, icon='○'):
    text(d,(100,y),label,22,'#24463A',True); rounded(d,(100,y+38,980,y+124),17,'#F8FAFC','#E2E8F0',2); text(d,(128,y+66),icon,27,'#6F9E87'); text(d,(178,y+67),placeholder,23,'#718096')
def header(d, active):
    text(d,(100,80),'Cogo',49,'#0E4834',True); rounded(d,(250,86,472,132),22,'#E8F5EF'); text(d,(274,98),'Đi chung an toàn',18,'#2D7755',True)
    rounded(d,(100,235,980,305),17,'#EFF6F2');
    for idx, label in enumerate(['Đăng nhập','Đăng ký']):
        x=105+idx*435
        if active==idx: rounded(d,(x,240,x+430,300),13,'#FFFFFF'); text(d,(x+140,258),label,20,'#0E4834',True)
        else: text(d,(x+145,258),label,20,'#789087')
def footer_ui(d):
    text(d,(220,1780),'Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ',18,'#718096')
def save(img,name): img.save(OUT_UI/name, quality=95)
def login():
    img=Image.new('RGB',(1080,1920),'#FFFFFF'); d=ImageDraw.Draw(img); header(d,0)
    text(d,(100,375),'Chào mừng bạn!',48,'#0E4834',True); text(d,(100,445),'Đăng nhập bằng số điện thoại để tiếp tục',23,'#6B7E76')
    input_box(d,550,'Số điện thoại','Nhập số điện thoại','☎'); rounded(d,(100,785,980,880),20,'#6F9E87'); text(d,(380,816),'Đăng nhập  →',26,'#FFFFFF',True)
    text(d,(260,935),'Chưa có tài khoản?',21,'#718096'); text(d,(560,935),'Đăng ký ngay',21,'#2D7755',True); footer_ui(d); save(img,'01-login.png')
def register():
    img=Image.new('RGB',(1080,1920),'#FFFFFF'); d=ImageDraw.Draw(img); header(d,1)
    text(d,(100,375),'Tạo tài khoản mới',45,'#0E4834',True); text(d,(100,445),'Kết nối và chia sẻ chuyến đi cùng sinh viên',22,'#6B7E76')
    input_box(d,540,'Họ và tên','Nguyễn Văn A','♙'); input_box(d,700,'Số điện thoại','09xx xxx xxx','☎'); input_box(d,860,'Trường học','Chọn trường của bạn','⌄')
    rounded(d,(100,1050,980,1145),20,'#6F9E87'); text(d,(315,1080),'Xác thực sinh viên  →',25,'#FFFFFF',True); footer_ui(d); save(img,'02-register.png')
def otp():
    img=Image.new('RGB',(1080,1920),'#FFFFFF'); d=ImageDraw.Draw(img); text(d,(100,105),'Cogo',49,'#0E4834',True)
    rounded(d,(100,275,232,321),22,'#E8F5EF'); text(d,(124,287),'Bước 2/3',18,'#2D7755',True)
    text(d,(100,410),'Xác thực số điện thoại',42,'#0E4834',True); text(d,(100,480),'Mã OTP đã gửi tới 09xx xxx xxx',23,'#6B7E76')
    for i in range(6): rounded(d,(100+i*145,620,215+i*145,744),18,'#F8FAFC','#E2E8F0',2)
    text(d,(312,810),'Gửi lại mã (00:38)',21,'#2D7755',True); rounded(d,(100,900,980,995),20,'#0E4834'); text(d,(426,930),'Xác nhận',26,'#FFFFFF',True); footer_ui(d); save(img,'03-otp-verification.png')
def verification():
    img=Image.new('RGB',(1080,1920),'#FFFFFF'); d=ImageDraw.Draw(img); text(d,(100,80),'Cogo',49,'#0E4834',True)
    rounded(d,(100,180,980,194),7,'#E8F5EF'); rounded(d,(100,180,980,194),7,'#6F9E87'); text(d,(100,235),'Bước 3/3 · Xác thực sinh viên',20,'#2D7755',True)
    text(d,(100,315),'Xác thực sinh viên',45,'#0E4834',True); text(d,(100,383),'Giúp CoGo xây dựng cộng đồng an toàn hơn',21,'#6B7E76')
    input_box(d,475,'Trường Đại học / Cao đẳng','Chọn trường','⌄'); input_box(d,640,'Mã số sinh viên','Nhập MSSV','▣')
    text(d,(100,810),'Mặt trước thẻ sinh viên',22,'#24463A',True); rounded(d,(100,855,980,1235),24,'#F8FAFC','#A5DFC5',3); text(d,(440,938),'▣',50,'#6F9E87'); text(d,(370,1012),'Tải ảnh thẻ sinh viên',25,'#0E4834',True); text(d,(275,1055),'JPG, PNG tối đa 5MB · ảnh cần rõ nét',18,'#718096'); rounded(d,(190,1100,510,1175),16,'#FFFFFF','#6F9E87',2); text(d,(246,1125),'Chụp trực tiếp',19,'#2D7755',True); rounded(d,(545,1100,870,1175),16,'#6F9E87'); text(d,(620,1125),'Tải ảnh lên',19,'#FFFFFF',True)
    rounded(d,(100,1320,980,1415),20,'#0E4834'); text(d,(285,1350),'Gửi thông tin xác thực',24,'#FFFFFF',True); footer_ui(d); save(img,'04-student-verification.png')

if __name__ == '__main__':
    ensure(); build_pdf(); login(); register(); otp(); verification()
