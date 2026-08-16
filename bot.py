import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters

# ==========================================================
# សូមបញ្ចូល BOT_TOKEN និង ADMIN_CHAT_ID របស់អ្នកនៅទីនេះ
# ==========================================================
BOT_TOKEN = "8994221143:AAFtNb2tA7eqIzmbonP58qhdvgcxyODwZWA"
ADMIN_CHAT_ID = "321592436"

# ==========================================================
# ពេលភ្ញៀវផ្ញើរូបភាពមក (ដំណើរការសំខាន់)
# ==========================================================
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id

    # បង្កើតប៊ូតុង Admin ជានិច្ច
    keyboard = [
        [
            InlineKeyboardButton("✅ អនុម័ត (Confirm)", callback_data=f'confirm|{chat_id}'),
            InlineKeyboardButton("❌ បដិសេធ (Reject)", callback_data=f'reject|{chat_id}')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # រៀបចំអត្ថបទសម្រាប់ Admin (ដោយផ្ទាល់ពី Caption នៃរូបភាព)
    # ចំណាំ៖ Web App ត្រូវតែផ្ញើ Caption ត្រឹមត្រូវមកជាមួយ!
    caption_from_user = update.message.caption or "រូបភាពបង្កាន់ដៃទូទាត់"
    
    admin_text = f"ភ្ញៀវបានផ្ញើរូបភាព។\nឈ្មោះ: {user.first_name} {user.last_name or ''}\nChat ID: {chat_id}\n\n{caption_from_user}"
    
    # ផ្ញើរូបទៅ Admin ជាមួយប៊ូតុង
    await context.bot.send_photo(
        chat_id=ADMIN_CHAT_ID,
        photo=update.message.photo[-1].file_id,
        caption=admin_text,
        reply_markup=reply_markup
    )

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
    await update.message.reply_text("👋 សួស្តី! សូមចូលទៅកាន់ Mini App របស់យើង ដើម្បីធ្វើការបញ្ជាទិញ និងផ្ញើរូបភាពបង្កាន់ដៃ។")

if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(CallbackQueryHandler(button_click))
    print("🤖 Bot កំពុងដំណើរការ... រង់ចាំសារ...")
    application.run_polling()
