import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters

BOT_TOKEN = "8994221143:AAFtNb2tA7eqIzmbonP58qhdvgcxyODwZWA"
ADMIN_CHAT_ID = "321592436"

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print("📸 Bot បានទទួលរូបភាពហើយ!")
    user = update.effective_user
    chat_id = update.effective_chat.id
    
    caption = update.message.caption
    print(f"📝 Caption ដែលទទួលបាន: {caption}")

    # បង្កើតប៊ូតុង
    keyboard = [
        [
            InlineKeyboardButton("✅ អនុម័ត (Confirm)", callback_data=f'confirm|{chat_id}'),
            InlineKeyboardButton("❌ បដិសេធ (Reject)", callback_data=f'reject|{chat_id}')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # បន្ថែមអត្ថបទឱ្យប្រាកដថាមិនទទេ
    text_to_send = f"🆕 បញ្ជាទិញថ្មីពី {user.first_name}\nChat ID: {chat_id}\n\n{caption if caption else 'គ្មាន Caption'}"
    
    # ផ្ញើប៊ូតុងទៅ Admin
    await context.bot.send_message(
        chat_id=ADMIN_CHAT_ID,
        text=text_to_send,
        reply_markup=reply_markup
    )
    print("✅ Bot បានផ្ញើប៊ូតុងទៅ Admin រួចរាល់!")

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
        await context.bot.send_message(
            chat_id=customer_chat_id,
            text="✅ **ការទូទាត់ទទួលបានជោគជ័យ!**\n\nតូបជជុសនឹងរៀបចំឥវ៉ាន់ និងដឹកជញ្ជូនទៅអ្នកឆាប់ៗ! សូមរង់ចាំ។"
        )
        await query.edit_message_text(text="✅ អ្នកបានអនុម័តការទូទាត់នេះហើយ។")

    elif action == 'reject':
        await context.bot.send_message(
            chat_id=customer_chat_id,
            text="❌ **ការទូទាត់មិនទាន់ត្រូវបានអនុម័តទេ!**\n\nសូមទោស រូបភាពមិនច្បាស់លាស់។ សូមថតរូបភាពឡើងវិញ ហើយផ្ញើមកយើងខ្ញុំវិញ។"
        )
        await query.edit_message_text(text="❌ អ្នកបានបដិសេធការទូទាត់នេះ។")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 សួស្តី! សូមប្រើ Mini App ដើម្បីធ្វើការបញ្ជាទិញ។")

if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(CallbackQueryHandler(button_click))
    print("🤖 Bot កំពុងដំណើរការ... រង់ចាំសារ...")
    application.run_polling()
