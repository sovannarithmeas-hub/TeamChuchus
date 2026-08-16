# vercel: python3
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters

# ==========================================================
# សូមបញ្ចូល BOT_TOKEN និង ADMIN_CHAT_ID របស់អ្នកនៅទីនេះ
# ==========================================================
BOT_TOKEN = "8994221143:AAFtNb2tA7eqIzmbonP58qhdvgcxyODwZWA"
ADMIN_CHAT_ID = "321592436"

# ត្រូវប្រាកដថា File ត្រូវបាន Save ត្រឹមត្រូវ!

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ពេលភ្ញៀវផ្ញើអត្ថបទមក យើងនឹងរក្សាទុកវាទុកក្នុង Memory មួយភ្លែត
    context.user_data['pending_caption'] = update.message.text
    # ឆ្លើយតបទៅភ្ញៀវថាបានទទួលព័ត៌មាន ហើយរង់ចាំរូបភាព
    await update.message.reply_text("📝 បានទទួលព័ត៌មានបញ្ជាទិញរួចរាល់។ សូមផ្ញើរូបភាពបង្កាន់ដៃទូទាត់ជាបន្ទាប់។")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id

    # ទាញយកអត្ថបទដែលបានផ្ញើពីមុន (បើមាន)
    caption = context.user_data.get('pending_caption', '')
    # លុបវាចេញពី Memory ដើម្បីកុំឱ្យប៉ះពាល់រូបថ្មីៗ
    context.user_data['pending_caption'] = ''

    # បង្កើតប៊ូតុង
    keyboard = [
        [
            InlineKeyboardButton("✅ អនុម័ត (Confirm)", callback_data=f'confirm|{chat_id}'),
            InlineKeyboardButton("❌ បដិសេធ (Reject)", callback_data=f'reject|{chat_id}')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # រៀបចំអត្ថបទសម្រាប់ Admin
    admin_text = f"ភ្ញៀវបានផ្ញើរូបភាពបង្កាន់ដៃ។\nឈ្មោះ: {user.first_name} {user.last_name or ''}\nChat ID: {chat_id}\n\n{caption}"
    
    # ផ្ញើរូបទៅ Admin ជាមួយប៊ូតុង
    await context.bot.send_photo(
        chat_id=ADMIN_CHAT_ID,
        photo=update.message.photo[-1].file_id,
        caption=admin_text,
        reply_markup=reply_markup
    )
    
    # ឆ្លើយតបទៅភ្ញៀវថាបានផ្ញើជោគជ័យ
    await update.message.reply_text("📸 រូបភាពរបស់អ្នកបានបញ្ជូនទៅកាន់ Admin ដោយជោគជ័យ។ សូមរង់ចាំការត្រួតពិនិត្យ!")

async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if str(query.from_user.id) != ADMIN_CHAT_ID:
        await query.edit_message_text(text="⛔ អ្នកមិនមែនជា Admin ទេ!")
        return

    data = query.data.split('|')
    action = data[0]
    customer_chat_id = data[1]

    if action == 'confirm':
        try:
            await context.bot.send_message(
                chat_id=customer_chat_id,
                text="✅ **ការទូទាត់ទទួលបានជោគជ័យ!**\n\nតូបជជុសនឹងរៀបចំឥវ៉ាន់ និងដឹកជញ្ជូនទៅអ្នកឆាប់ៗ! សូមរង់ចាំ។"
            )
            await query.edit_message_text(text="✅ អ្នកបានអនុម័តការទូទាត់នេះហើយ។")
        except Exception as e:
            await query.edit_message_text(text=f"❌ មានបញ្ហា: {e}")

    elif action == 'reject':
        try:
            await context.bot.send_message(
                chat_id=customer_chat_id,
                text="❌ **ការទូទាត់មិនទាន់ត្រូវបានអនុម័តទេ!**\n\nសូមទោស រូបភាពមិនច្បាស់លាស់។ សូមថតរូបភាពឡើងវិញ ហើយផ្ញើមកយើងខ្ញុំវិញ។"
            )
            await query.edit_message_text(text="❌ អ្នកបានបដិសេធការទូទាត់នេះ។")
        except Exception as e:
            await query.edit_message_text(text=f"❌ មានបញ្ហា: {e}")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 សួស្តី! សូមបំពេញព័ត៌មានបញ្ជាទិញតាម Mini App របស់យើង រួចផ្ញើរូបភាពបង្កាន់ដៃមកទីនេះ។")

if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(CallbackQueryHandler(button_click))
    print("🤖 Bot កំពុងដំណើរការ... រង់ចាំសារ...")
    application.run_polling()
