import streamlit as st
import json
import os
from datetime import datetime
import asyncio
import sys

# Page configuration
st.set_page_config(
    page_title="🐦 Enhanced AI Tweet Monitor",
    page_icon="🐦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import with fallback for cloud deployment
try:
    from ai_tweet_monitor import AITweetMonitor
    MONITOR_AVAILABLE = True
except ImportError:
    MONITOR_AVAILABLE = False
    st.warning("⚠️ AI Tweet Monitor module not available. Running in demo mode.")

# Custom CSS
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #1DA1F2 0%, #14171A 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #1DA1F2;
        margin: 0.5rem 0;
    }
    .tweet-card {
        background: white;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid #e1e8ed;
        margin: 0.5rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .rewrite-card {
        background: #f0f8ff;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid #1DA1F2;
        margin: 0.5rem 0;
    }
    .status-good { color: #28a745; }
    .status-warning { color: #ffc107; }
    .status-error { color: #dc3545; }
</style>
""", unsafe_allow_html=True)

# Header
st.markdown("""
<div class="main-header">
    <h1>🐦 Enhanced AI Tweet Monitor</h1>
    <p>Real-time monitoring of 100+ AI Twitter accounts with intelligent tweet rewriting</p>
</div>
""", unsafe_allow_html=True)

# Initialize session state
if 'data' not in st.session_state:
    st.session_state.data = {}
if 'monitor_running' not in st.session_state:
    st.session_state.monitor_running = False

# Sidebar
st.sidebar.title("🔧 Control Panel")

# API Status Check
def check_api_status():
    """Check API configuration status"""
    status = {}
    
    # Check for secrets (Streamlit Cloud) or environment variables
    twitter_keys = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET']
    
    # Try Streamlit secrets first, then environment variables
    twitter_configured = True
    for key in twitter_keys:
        if hasattr(st, 'secrets') and key in st.secrets:
            continue
        elif os.getenv(key):
            continue
        else:
            twitter_configured = False
            break
    
    status['twitter'] = twitter_configured
    
    # Check OpenAI
    openai_configured = False
    if hasattr(st, 'secrets') and 'OPENAI_API_KEY' in st.secrets:
        openai_configured = True
    elif os.getenv('OPENAI_API_KEY'):
        openai_configured = True
    
    status['openai'] = openai_configured
    
    return status

# Display API status
api_status = check_api_status()
st.sidebar.subheader("🔑 API Status")

if api_status['twitter']:
    st.sidebar.success("🐦 Twitter API: Configured")
else:
    st.sidebar.error("🐦 Twitter API: Not configured")
    st.sidebar.info("Add your Twitter API keys to Streamlit secrets")

if api_status['openai']:
    st.sidebar.success("🤖 OpenAI API: Configured")
else:
    st.sidebar.info("🤖 OpenAI API: Optional (for AI rewrites)")

# Load existing data function
@st.cache_data(ttl=300)  # Cache for 5 minutes
def load_data():
    """Load data from JSON files"""
    data = {}
    files = {
        'tweets': 'ai_tweets_data.json',
        'analysis': 'ai_trends_analysis.json',
        'rewrites': 'ai_tweet_rewrites.json',
        'top_tweets': 'ai_top_tweets.json'
    }
    
    for key, filename in files.items():
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    data[key] = json.load(f)
            except Exception as e:
                st.sidebar.error(f"Error loading {filename}: {str(e)}")
                data[key] = None
        else:
            data[key] = None
    
    return data

# Demo data for when no real data is available
def get_demo_data():
    """Provide demo data for demonstration purposes"""
    return {
        'tweets': [
            {
                'account': 'openai',
                'content': 'Excited to announce our latest breakthrough in AI safety research!',
                'likes': 1250,
                'retweets': 340,
                'replies': 89,
                'engagement_score': 1679,
                'timestamp': '2024-01-15T10:30:00Z'
            },
            {
                'account': 'anthropic',
                'content': 'Constitutional AI represents a new paradigm in AI alignment.',
                'likes': 890,
                'retweets': 234,
                'replies': 67,
                'engagement_score': 1191,
                'timestamp': '2024-01-15T09:15:00Z'
            }
        ],
        'analysis': {
            'total_tweets': 1247,
            'total_accounts': 103,
            'total_engagement': 45678,
            'twitter_api_status': 'Connected' if api_status['twitter'] else 'Demo Mode',
            'openai_status': 'Available' if api_status['openai'] else 'Demo Mode',
            'trending_keywords': {
                'AI': 234,
                'machine learning': 189,
                'neural networks': 156,
                'GPT': 134,
                'artificial intelligence': 123
            },
            'top_performing_accounts': [
                {'account': 'openai', 'avg_score': 1245.6, 'tweets': 23},
                {'account': 'anthropic', 'avg_score': 987.3, 'tweets': 18}
            ]
        },
        'top_tweets': [
            {
                'account': 'openai',
                'content': 'Excited to announce our latest breakthrough in AI safety research!',
                'likes': 1250,
                'retweets': 340,
                'replies': 89,
                'engagement_score': 1679
            }
        ],
        'rewrites': [
            {
                'original_account': 'smallai_account',
                'reference_account': 'openai',
                'original': 'We made a new AI model',
                'rewritten': 'Excited to unveil our groundbreaking AI model that pushes the boundaries of what\'s possible!',
                'rewrite_method': 'AI-powered (GPT-4)',
                'improvement_potential': 'High'
            }
        ]
    }

# Monitor controls
async def run_monitoring_cycle():
    """Run the monitoring cycle asynchronously"""
    if not MONITOR_AVAILABLE:
        st.sidebar.warning("Monitor not available - using demo data")
        return False
    
    try:
        monitor = AITweetMonitor()
        await monitor.run_monitoring_cycle()
        return True
    except Exception as e:
        st.sidebar.error(f"Error running monitor: {str(e)}")
        return False

# Control buttons
col1, col2 = st.sidebar.columns(2)

with col1:
    if st.button("🔄 Run Monitor", type="primary", disabled=st.session_state.monitor_running):
        st.session_state.monitor_running = True
        with st.spinner("Running monitoring cycle..."):
            if MONITOR_AVAILABLE and api_status['twitter']:
                # Run actual monitoring
                success = asyncio.run(run_monitoring_cycle())
                if success:
                    st.sidebar.success("✅ Monitoring completed!")
                    st.cache_data.clear()  # Clear cache to reload data
                else:
                    st.sidebar.error("❌ Monitoring failed")
            else:
                # Simulate monitoring for demo
                import time
                time.sleep(2)
                st.sidebar.info("📊 Demo mode - using sample data")
        st.session_state.monitor_running = False
        st.rerun()

with col2:
    if st.button("📊 Dashboard"):
        try:
            if os.path.exists("create_dashboard.py"):
                import subprocess
                subprocess.run([sys.executable, "create_dashboard.py"], check=True)
                st.sidebar.success("✅ Dashboard generated!")
            else:
                st.sidebar.info("📊 Dashboard feature available in full version")
        except Exception as e:
            st.sidebar.error(f"❌ Error: {str(e)}")

# Load data (use demo data if no real data available)
try:
    data = load_data()
    # If no data files exist, use demo data
    if not any(data.values()):
        data = get_demo_data()
        st.info("📊 Displaying demo data. Run monitoring cycle to fetch real data.")
except Exception:
    data = get_demo_data()
    st.info("📊 Displaying demo data. Configure API keys and run monitoring for real data.")

# Main dashboard
col1, col2, col3, col4 = st.columns(4)

# Key metrics
if data.get('analysis'):
    analysis = data['analysis']
    
    with col1:
        st.metric(
            "📊 Total Tweets",
            f"{analysis.get('total_tweets', 0):,}",
            delta=None
        )
    
    with col2:
        st.metric(
            "🏢 AI Accounts",
            analysis.get('total_accounts', 0),
            delta=None
        )
    
    with col3:
        st.metric(
            "💬 Total Engagement",
            f"{analysis.get('total_engagement', 0):,}",
            delta=None
        )
    
    with col4:
        rewrites_count = len(data.get('rewrites', [])) if data.get('rewrites') else 0
        st.metric(
            "✍️ Tweet Rewrites",
            rewrites_count,
            delta=None
        )

# Status indicators
st.subheader("🔍 System Status")
col1, col2 = st.columns(2)

with col1:
    if data.get('analysis'):
        twitter_status = data['analysis'].get('twitter_api_status', 'Unknown')
        if 'Connected' in twitter_status:
            st.success(f"🐦 Twitter API: {twitter_status}")
        elif 'Demo' in twitter_status:
            st.info(f"🐦 Twitter API: {twitter_status}")
        else:
            st.warning(f"🐦 Twitter API: {twitter_status}")
    else:
        st.info("🐦 Twitter API: No data available")

with col2:
    if data.get('analysis'):
        openai_status = data['analysis'].get('openai_status', 'Unknown')
        if 'Available' in openai_status:
            st.success(f"🤖 AI Rewriting: {openai_status}")
        elif 'Demo' in openai_status:
            st.info(f"🤖 AI Rewriting: {openai_status}")
        else:
            st.info(f"🤖 AI Rewriting: {openai_status}")
    else:
        st.info("🤖 AI Rewriting: No data available")

# Tabs for different views
tab1, tab2, tab3, tab4 = st.tabs(["📊 Analytics", "🏆 Top Tweets", "✍️ Rewrites", "📈 Trends"])

with tab1:
    st.subheader("📊 Analytics Overview")
    
    if data.get('analysis'):
        analysis = data['analysis']
        
        # Top accounts
        if 'top_performing_accounts' in analysis:
            st.subheader("🏆 Top Performing Accounts")
            for i, account in enumerate(analysis['top_performing_accounts'][:10], 1):
                st.markdown(f"""
                <div class="metric-card">
                    <strong>#{i} @{account['account']}</strong><br>
                    Average Score: {account['avg_score']:.1f} | Tweets: {account['tweets']}
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("📊 No analytics data available. Run a monitoring cycle to generate data.")

with tab2:
    st.subheader("🏆 Top Performing Tweets")
    
    if data.get('top_tweets'):
        for i, tweet in enumerate(data['top_tweets'][:10], 1):
            engagement_score = tweet.get('engagement_score', 0)
            likes = tweet.get('likes', 0)
            retweets = tweet.get('retweets', 0)
            replies = tweet.get('replies', 0)
            
            st.markdown(f"""
            <div class="tweet-card">
                <h4>#{i} @{tweet['account']}</h4>
                <p>{tweet['content'][:200]}{'...' if len(tweet['content']) > 200 else ''}</p>
                <div style="display: flex; gap: 20px; margin-top: 10px;">
                    <span>🔥 Score: {engagement_score:.1f}</span>
                    <span>❤️ {likes:,}</span>
                    <span>🔄 {retweets:,}</span>
                    <span>💬 {replies:,}</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("🏆 No top tweets data available. Run a monitoring cycle to generate data.")

with tab3:
    st.subheader("✍️ Tweet Rewrites")
    
    if data.get('rewrites'):
        # Rewrite statistics
        total_rewrites = len(data['rewrites'])
        ai_rewrites = sum(1 for r in data['rewrites'] if 'AI-powered' in r.get('rewrite_method', ''))
        rule_rewrites = total_rewrites - ai_rewrites
        high_potential = sum(1 for r in data['rewrites'] if r.get('improvement_potential') == 'High')
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("🤖 AI-Powered", ai_rewrites)
        with col2:
            st.metric("📝 Rule-Based", rule_rewrites)
        with col3:
            st.metric("🚀 High Potential", high_potential)
        
        # Show rewrites
        for i, rewrite in enumerate(data['rewrites'][:10], 1):
            method_color = "#4CAF50" if "AI-powered" in rewrite.get('rewrite_method', '') else "#2196F3"
            potential_emoji = {"High": "🚀", "Medium": "📈", "Low": "📊"}.get(rewrite.get('improvement_potential', 'Medium'), "📊")
            
            st.markdown(f"""
            <div class="rewrite-card">
                <h4>#{i} @{rewrite.get('original_account', 'Unknown')} → @{rewrite.get('reference_account', 'Unknown')}</h4>
                <div style="margin: 10px 0;">
                    <strong>Original:</strong><br>
                    <em>{rewrite['original'][:150]}{'...' if len(rewrite['original']) > 150 else ''}</em>
                </div>
                <div style="margin: 10px 0;">
                    <strong>Rewritten:</strong><br>
                    <strong>{rewrite['rewritten'][:150]}{'...' if len(rewrite['rewritten']) > 150 else ''}</strong>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 10px;">
                    <span style="color: {method_color};">🔧 {rewrite.get('rewrite_method', 'Unknown')}</span>
                    <span>{potential_emoji} {rewrite.get('improvement_potential', 'Medium')} Potential</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("✍️ No rewrite data available. Run a monitoring cycle with rewrites enabled.")

with tab4:
    st.subheader("📈 Trending Keywords")
    
    if data.get('analysis') and 'trending_keywords' in data['analysis']:
        keywords = data['analysis']['trending_keywords']
        
        # Create two columns for keywords
        col1, col2 = st.columns(2)
        keyword_items = list(keywords.items())
        
        for i, (keyword, count) in enumerate(keyword_items[:20]):
            target_col = col1 if i % 2 == 0 else col2
            with target_col:
                st.markdown(f"""
                <div class="metric-card">
                    <strong>{keyword}</strong>: {count} mentions
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("📈 No trending data available. Run a monitoring cycle to generate data.")

# Footer
st.markdown("---")
st.markdown(f"""
<div style="text-align: center; color: #666; padding: 20px;">
    🐦 Enhanced AI Tweet Monitor | Real-time monitoring of 100+ AI Twitter accounts<br>
    Last updated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} | 
    Status: {'🟢 Live Data' if api_status['twitter'] else '🟡 Demo Mode'}
</div>
""", unsafe_allow_html=True)

# Auto-refresh option
if st.sidebar.checkbox("🔄 Auto-refresh (30s)"):
    import time
    time.sleep(30)
    st.rerun()