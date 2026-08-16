import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters

BOT_TOKEN = "8994221143:AAFtNb2tA7eqIzmbonP58qhdvgcxyODwZWA"
ADMIN_CHAT_ID = "321592436"

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id
    caption = update.message.caption or "រូបភាពបង្កាន់ដៃ"

    # 1. ផ្ញើរូបទៅ Admin
    await context.bot.send_photo(
        chat_id=ADMIN_CHAT_ID,
        photo=update.message.photo[-1].file_id,
        caption=f"🖼️ រូបភាពបង្កាន់ដៃពី {user.first_name}\nChat ID: {chat_id}"
    )

    # 2. បង្កើតប៊ូតុង
    keyboard = [[
        InlineKeyboardButton("✅ អនុម័ត", callback_data=f'confirm|{chat_id}'),
        InlineKeyboardButton("❌ បដិសេធ", callback_data=f'reject|{chat_id}')
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # 3. ផ្ញើប៊ូតុងជាសារដាច់ដោយឡែក ជាមួយ Caption
    await context.bot.send_message(
        chat_id=ADMIN_CHAT_ID,
        text=f"📋 ព័ត៌មានបញ្ជាទិញ:\n\n{caption}\n\n👇 សូមចុចប៊ូតុងខាងក្រោម៖",
        reply_markup=reply_markup
    )

async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if str(query.from_user.id) != ADMIN_CHAT_ID:
        await query.edit_message_text(text="⛔ គ្មានសិទ្ធិ")
        return
    data = query.data.split('|')
    action, customer_chat_id = data[0], data[1]

    if action == 'confirm':
        await context.bot.send_message(chat_id=customer_chat_id, text="✅ **ការទូទាត់ទទួលបានជោគជ័យ!**\n\nតូបជជុសនឹងរៀបចំឥវ៉ាន់ និងដឹកជញ្ជូនទៅអ្នកឆាប់ៗ! សូមរង់ចាំ។")
        await query.edit_message_text(text="✅ អ្នកបានអនុម័តការទូទាត់នេះហើយ។")
    elif action == 'reject':
        await context.bot.send_message(chat_id=customer_chat_id, text="❌ **ការទូទាត់មិនទាន់ត្រូវបានអនុម័តទេ!**\n\nសូមទោស រូបភាពមិនច្បាស់លាស់។ សូមថតរូបភាពឡើងវិញ ហើយផ្ញើមកយើងខ្ញុំវិញ។")
        await query.edit_message_text(text="❌ អ្នកបានបដិសេធការទូទាត់នេះ។")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 សួស្តី! សូមប្រើ Mini App របស់យើងដើម្បីធ្វើការបញ្ជាទិញ។")

if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(CallbackQueryHandler(button_click))
    print("🤖 Bot កំពុងដំណើរការ...")
    app.run_polling()
