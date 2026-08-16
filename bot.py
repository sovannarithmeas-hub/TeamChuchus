# vercel: python3
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters

# ==========================================================
# សូមបញ្ចូល BOT_TOKEN និង ADMIN_CHAT_ID របស់អ្នកនៅទីនេះ
# ==========================================================
BOT_TOKEN = "8994221143:AAFtNb2tA7eqIzmbonP58qhdvgcxyODwZWA"
ADMIN_CHAT_ID = "321592436"

# ==========================================================
# ដំណើរការពេលភ្ញៀវផ្ញើរូបភាពមក
# ==========================================================
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id

    # បង្កើតប៊ូតុងសម្រាប់ Admin
    keyboard = [
        [
            InlineKeyboardButton("✅ អនុម័ត (Confirm)", callback_data=f'confirm|{chat_id}'),
            InlineKeyboardButton("❌ បដិសេធ (Reject)", callback_data=f'reject|{chat_id}')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    caption = f"ភ្ញៀវបានផ្ញើរូបភាពបង្កាន់ដៃ។\nឈ្មោះ: {user.first_name} {user.last_name or ''}\nChat ID: {chat_id}"
    
    # ផ្ញើរូបទៅ Admin ជាមួយប៊ូតុង
    await context.bot.send_photo(
        chat_id=ADMIN_CHAT_ID,
        photo=update.message.photo[-1].file_id,
        caption=caption,
        reply_markup=reply_markup
    )
    
    # ឆ្លើយតបទៅភ្ញៀវថាបានផ្ញើជោគជ័យ
    await update.message.reply_text("📸 រូបភាពរបស់អ្នកបានបញ្ជូនទៅកាន់ Admin ដោយជោគជ័យ។ សូមរង់ចាំការត្រួតពិនិត្យ!")

# ==========================================================
# ដំណើរការពេល Admin ចុចប៊ូតុង
# ==========================================================
async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    # ត្រួតពិនិត្យថាអ្នកចុចគឺជា Admin ពិតប្រាកដ
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

# ==========================================================
# បញ្ជា Start មូលដ្ឋាន
# ==========================================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 សួស្តី! សូមផ្ញើរូបភាពបង្កាន់ដៃទូទាត់ ដើម្បីឱ្យ Admin ត្រួតពិនិត្យ។")

# ==========================================================
# ចាប់ផ្តើម Bot
# ==========================================================
if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(CallbackQueryHandler(button_click))
    print("🤖 Bot កំពុងដំណើរការ... រង់ចាំសារ...")
    application.run_polling()
