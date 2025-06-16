const subreddits = [
    { name: "sports", category: "Sports", className: "sports" },
    { name: "nba", category: "Sports", className: "sports" },
    { name: "health", category: "Health", className: "health" },
    { name: "fitness", category: "Health", className: "health" },
    { name: "popculturechat", category: "Celebrities", className: "celebrities" },
    { name: "Fauxmoi", category: "Celebrities", className: "celebrities" }
];
const baseUrl = "https://www.reddit.com/r/";
const userBaseUrl = "https://www.reddit.com/user/";
const userAgent = "web:reddit-topic-aggregator:v1.0.0 (by /u/yourusername)";
const cacheKey = "reddit_posts_cache";
const cacheTTL = 5 * 60 * 1000; // 5 minutes

const postsContainer = document.getElementById("posts-container");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const filterButtons = document.querySelectorAll(".filter-btn");
const sortableHeaders = document.querySelectorAll(".sortable");

let sortState = { column: "created_utc", direction: "desc" };

const forumCategory = (subredditName) => {
    const subreddit = subreddits.find(s => s.name === subredditName) || { category: "General", className: "general" };
    const url = `${baseUrl}${subreddit.name}`;
    return `<a href="${url}" class="category ${subreddit.className}" target="_blank">${subreddit.category}</a>`;
};

const timeAgo = (createdUtc) => {
    const currentTime = new Date();
    const postTime = new Date(createdUtc * 1000);
    const timeDifference = currentTime - postTime;
    const msPerMinute = 1000 * 60;
    const minutesAgo = Math.floor(timeDifference / msPerMinute);
    const hoursAgo = Math.floor(minutesAgo / 60);
    const daysAgo = Math.floor(hoursAgo / 24);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${daysAgo}d ago`;
};

const getCachedData = () => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTTL) return data;
    }
    return null;
};

const setCachedData = (data) => {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
};

const fetchAvatar = async (author) => {
    try {
        const res = await fetch(`${userBaseUrl}${author}/about.json`, {
            headers: { "User-Agent": userAgent }
        });
        const data = await res.json();
        return data.data.icon_img || "https://www.redditstatic.com/avatars/defaults/avatar_default_7.png";
    } catch {
        return "https://www.redditstatic.com/avatars/defaults/avatar_default_7.png";
    }
};

const sortPosts = (posts, column, direction) => {
    return [...posts].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        if (column === "title") {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            return direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return direction === "asc" ? valA - valB : valB - valA;
    });
};

const fetchData = async () => {
    loading.style.display = "block";
    error.style.display = "none";
    try {
        const cachedPosts = getCachedData();
        if (cachedPosts) {
            showLatestPosts(cachedPosts);
            loading.style.display = "none";
            return;
        }

        const allPosts = [];
        for (const subreddit of subreddits) {
            const res = await fetch(`${baseUrl}${subreddit.name}/new.json?limit=5`, {
                headers: { "User-Agent": userAgent }
            });
            if (!res.ok) throw new Error(`Failed to fetch /r/${subreddit.name}`);
            const data = await res.json();
            const posts = data.data.children.map(post => ({
                subreddit: subreddit.name,
                title: post.data.title,
                permalink: `https://www.reddit.com${post.data.permalink}`,
                num_comments: post.data.num_comments,
                ups: post.data.ups,
                created_utc: post.data.created_utc,
                author: post.data.author
            }));
            allPosts.push(...posts);
        }

        const postsWithAvatars = await Promise.all(
            allPosts.slice(0, 10).map(async (post) => ({
                ...post,
                avatar: await fetchAvatar(post.author)
            }))
        );
        const remainingPosts = allPosts.slice(10).map(post => ({
            ...post,
            avatar: "https://www.redditstatic.com/avatars/defaults/avatar_default_7.png"
        }));
        const finalPosts = [...postsWithAvatars, ...remainingPosts];

        setCachedData(finalPosts);
        showLatestPosts(finalPosts);
        loading.style.display = "none";
    } catch (err) {
        console.error("Error fetching Reddit data:", err);
        error.textContent = "Failed to load posts. Please try again later.";
        error.style.display = "block";
        loading.style.display = "none";
    }
};

const showLatestPosts = (posts, filter = "all") => {
    const filteredPosts = filter === "all" ? posts : posts.filter(post => {
        const subreddit = subreddits.find(s => s.name === post.subreddit);
        return subreddit && subreddit.category.toLowerCase() === filter;
    });
    const sortedPosts = sortPosts(filteredPosts, sortState.column, sortState.direction);
    postsContainer.innerHTML = sortedPosts.map(post => {
        const subreddit = subreddits.find(s => s.name === post.subreddit) || { className: "general" };
        return `
        <tr class="${subreddit.className}-row">
            <td>
                <a href="${post.permalink}" target="_blank" class="post-title">${post.title}</a>
                ${forumCategory(post.subreddit)}
            </td>
            <td>
                <div class="avatar-container">
                    <img src="${post.avatar}" alt="${post.author}" width="30" height="30">
                </div>
            </td>
            <td>${post.num_comments}</td>
            <td>${post.ups}</td>
            <td>${timeAgo(post.created_utc)}</td>
        </tr>
    `;
    }).join("");
    updateSortIndicators();
};

const updateSortIndicators = () => {
    sortableHeaders.forEach(header => {
        const indicator = header.querySelector(".sort-indicator");
        header.classList.remove("active", "asc", "desc");
        if (header.dataset.sort === sortState.column) {
            header.classList.add("active", sortState.direction);
            indicator.textContent = sortState.direction === "asc" ? "↑" : "↓";
        } else {
            indicator.textContent = "";
        }
    });
};

sortableHeaders.forEach(header => {
    header.addEventListener("click", () => {
        const column = header.dataset.sort;
        if (sortState.column === column) {
            sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
        } else {
            sortState.column = column;
            sortState.direction = column === "title" ? "asc" : "desc";
        }
        const cachedPosts = getCachedData();
        if (cachedPosts) {
            const currentFilter = document.querySelector(".filter-btn.active").dataset.category;
            showLatestPosts(cachedPosts, currentFilter);
        }
    });
});

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        const filter = button.dataset.category;
        const table = document.querySelector("table");
        // Remove all category background classes
        table.classList.remove("sports-bg", "health-bg", "celebrities-bg", "general-bg", "all-bg");
        // Add the appropriate background class based on filter
        table.classList.add(`${filter}-bg`);
        const cachedPosts = getCachedData();
        if (cachedPosts) showLatestPosts(cachedPosts, filter);
    });
});

fetchData();

const toggleBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") document.body.classList.add("dark");

toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});