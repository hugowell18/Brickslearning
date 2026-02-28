# =========================
# Supabase + ModelScope 一次性配置脚本（PowerShell）
# 用法：
# 1) 把下面 $MODELSCOPE_API_KEY 改成你的真实 token
# 2) 在项目根目录执行：.\setup-ai-modelscope.ps1
# =========================

$ErrorActionPreference = "Stop"

# ====== 你只需要改这个 ======
$MODELSCOPE_API_KEY = "ms-4cd48d3a-ea43-42a6-9d25-38c7b28af6b4"

# ====== 可选配置（一般不用改） ======
$AI_PROVIDER = "modelscope"
$MODELSCOPE_BASE_URL = "https://api-inference.modelscope.cn/v1"
$MODELSCOPE_MODEL = "Qwen/Qwen2.5-7B-Instruct"
$FUNCTION_NAME = "server"

Write-Host "==> Step 1/4: 检查 Supabase CLI" -ForegroundColor Cyan
supabase --version | Out-Null

Write-Host "==> Step 2/4: 设置 Edge Function Secrets" -ForegroundColor Cyan
supabase secrets set AI_PROVIDER=$AI_PROVIDER
supabase secrets set MODELSCOPE_API_KEY=$MODELSCOPE_API_KEY
supabase secrets set MODELSCOPE_BASE_URL=$MODELSCOPE_BASE_URL
supabase secrets set MODELSCOPE_MODEL=$MODELSCOPE_MODEL

Write-Host "==> Step 3/4: 部署函数 $FUNCTION_NAME" -ForegroundColor Cyan
supabase functions deploy $FUNCTION_NAME

Write-Host "==> Step 4/4: 完成。下面给你本地前端检查项" -ForegroundColor Green
Write-Host ""
Write-Host "请确认 .env.local 里有：" -ForegroundColor Yellow
Write-Host "VITE_SUPABASE_URL=..."
Write-Host "VITE_SUPABASE_ANON_KEY=..."
Write-Host ""
Write-Host "前端 AI 请求默认走："
Write-Host "  {VITE_SUPABASE_URL}/functions/v1/server/make-server-9b296f01/ai/chat"
Write-Host ""
Write-Host "完成后启动前端测试："
Write-Host "  npm run dev"
