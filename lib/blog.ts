export type BlogCategory =
  | "Job Search"
  | "Resumes"
  | "Cover Letters"
  | "Interviews"
  | "Career Growth"
  | "Redundancy Support"
  | "Graduate Careers"
  | "Salary & Offers";

export type ArticleSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  publishDate: string;
  readingTime: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
  sections: ArticleSection[];
};

export const blogCategories: BlogCategory[] = [
  "Job Search",
  "Resumes",
  "Cover Letters",
  "Interviews",
  "Career Growth",
  "Redundancy Support",
  "Graduate Careers",
  "Salary & Offers",
];

export const blogArticles: BlogArticle[] = [
  {
    slug: "why-youre-not-getting-interviews-even-with-experience",
    title: "Why You're Not Getting Interviews (Even With Experience)",
    excerpt: "If your inbox is quiet despite strong experience, the problem is usually not your background. It is your job search process.",
    category: "Job Search",
    author: "ApplyHQ",
    publishDate: "30 May 2026",
    readingTime: "9 min read",
    image: "/blog/not-getting-interviews.png",
    imageAlt: "Professional job seeker waiting for interview responses",
    featured: true,
    sections: [
      {
        id: "why-applications-go-quiet",
        title: "Why Applications Go Quiet",
        paragraphs: [
          "You've got the experience. You've done the work. You've ticked most of the boxes on the job description, and yet your inbox stays quiet.",
          "No interview requests. No callbacks. Sometimes not even an automated acknowledgement that a real human glanced at your application.",
          "If this sounds familiar, you're not alone. It's one of the most frustrating situations a professional can face, and it's more common right now than most people realise. The Australian job market has shifted significantly, and the old approach to applying simply doesn't cut it anymore.",
          "The good news? In most cases, the problem isn't your experience. It's your process."
        ]
      },
      {
        id: "australian-job-market-has-changed",
        title: "The Australian Job Market Has Changed",
        paragraphs: [
          "The post-pandemic hiring boom is well and truly over. Across Australia, white-collar hiring has tightened considerably. Redundancies have hit sectors including finance, tech, media and professional services hard, pushing experienced candidates back into the market at the same time that advertised roles have decreased.",
          "What does that mean in practice? Roles that used to attract 30-50 applications are now attracting 200-400. Recruiters who used to spend five to ten minutes with each CV are now spending less than thirty seconds on an initial scan.",
          "The competitive landscape has shifted. But most people's job search strategy hasn't shifted with it.",
          "Sending out applications the same way you did five years ago, or even two years ago, is unlikely to get you the same results. The bar for standing out has risen, and the process rewards those who understand how hiring actually works today."
        ]
      },
      {
        id: "biggest-mistakes",
        title: "The Biggest Mistakes Keeping You Out of the Interview Room",
        paragraphs: [
          "A generic resume, even a well-written one, performs poorly in a competitive market. When a recruiter or hiring manager opens your application, they're asking one question: does this person clearly match what we're looking for? If they have to hunt for the answer, you've already lost.",
          "Applicant Tracking Systems are real, and they do matter. Most mid-to-large Australian employers now use some form of ATS to manage applications. If your resume uses different terminology to the job description, you may not surface in filtered results.",
          "Most resumes describe responsibilities. Few describe results. This is one of the biggest gaps between applications that get noticed and applications that don't.",
          "There's also a common belief that job hunting is a numbers game. This leads to a scattergun approach that hurts your results. Forty generic applications usually perform worse than eight well-researched, targeted ones.",
          "If you're not tracking what you've applied for, when, which resume version you used and what stage each application is at, you're operating blind. You can't spot patterns, follow up professionally or learn from what's working."
        ],
        bullets: [
          "Using the same resume for every application.",
          "Ignoring ATS keywords while also blaming ATS for everything.",
          "Writing weak achievement statements that describe tasks instead of results.",
          "Applying for too many roles without a clear strategy.",
          "Failing to track applications, documents, dates and outcomes.",
          "Relying too heavily on job boards instead of building recruiter and network relationships."
        ]
      },
      {
        id: "practical-framework",
        title: "What to Do Instead: A Practical Framework",
        paragraphs: [
          "A stronger job search does not need to be complicated. It needs to be selective, repeatable and honest about what is actually converting into interviews.",
          "Focus on roles where you genuinely meet 70-80% of the criteria. Research the company before you apply. Write a cover letter that shows you understand what they're dealing with and how you can help."
        ],
        bullets: [
          "Be selective: identify 10-15 roles per week that genuinely match your background and goals.",
          "Tailor every application: adjust your resume summary and top bullet points to reflect the role.",
          "Lead with achievements: replace task descriptions with outcome-focused statements wherever possible.",
          "Write a focused cover letter: explain why this role, why this company and what you bring to the specific challenge.",
          "Track everything: know the status of every application and review your conversion rate regularly.",
          "Work your network: aim for two to three genuine career conversations each week."
        ]
      },
      {
        id: "interview-success-starts-before-the-invitation",
        title: "Why Interview Success Starts Before the Interview Invitation",
        paragraphs: [
          "How you apply shapes how you interview.",
          "When you research a company properly before applying, you already know your talking points when you get the call. When you've tailored your resume to the role, you've already done the thinking about why you're a strong fit. When you track your applications systematically, you don't panic when a recruiter calls two weeks later because you know exactly which role it is and why you applied.",
          "A strong application process isn't just about getting interviews. It builds the foundation for performing well in them."
        ]
      },
      {
        id: "putting-it-all-together",
        title: "Putting It All Together",
        paragraphs: [
          "If your job search feels like it's going nowhere despite your experience, the problem is almost certainly fixable.",
          "You likely need to tailor more, strengthen your achievement statements, apply smarter, track better and network more actively. None of these are complicated. But they do require a system, not just effort.",
          "This is exactly what ApplyHQ is built for. It's a career command centre for Australian professionals who are serious about their search, helping you tailor resumes to specific roles, track applications across your pipeline and manage career transitions with structure that actually produces results.",
          "Whether you're navigating a redundancy, looking to change direction or simply overdue for a better opportunity, having the right tools in your corner makes a measurable difference.",
          "Your experience is real. Now it's time to make sure it comes across that way."
        ]
      },
      {
        id: "frequently-asked-questions",
        title: "Frequently Asked Questions",
        paragraphs: [
          "Why am I not getting interviews despite having relevant experience? The most common reasons are a generic resume that isn't tailored to the specific role, weak achievement statements that describe tasks rather than results, or applying without enough research into the company and role. In a competitive market, relevant experience alone isn't enough. You need to communicate that experience clearly and compellingly.",
          "Do ATS systems automatically reject my resume? ATS systems can filter resumes based on keywords, but they're not the only reason applications fail. Ensure your resume uses language from the job description, avoid complex formatting like tables or text boxes, and focus equally on making your resume readable and persuasive for the human reviewer who sees it next.",
          "How important is it to tailor my resume for each job application in Australia? Very important. The Australian job market is currently highly competitive across white-collar sectors, and recruiters can tell immediately when a resume is generic. Even small adjustments can significantly improve your application's performance.",
          "How many jobs should I be applying for each week? More is not always better. A focused search of 8-15 well-matched, tailored applications typically outperforms 40-50 generic ones. Track your response rate and adjust accordingly.",
          "What should I track when managing my job applications? At minimum: the role title, company name, date applied, version of resume used and current status. Ideally, also note contact names, follow-up dates and any feedback received.",
          "What is ApplyHQ? ApplyHQ is a career management platform designed for Australian professionals. It helps you tailor resumes to specific roles, organise and track your applications, prepare for interviews and manage career transitions all in one place."
        ]
      }
    ]
  },
  {
    slug: "hidden-cost-of-using-same-resume",
    title: "The Hidden Cost of Using the Same Resume for Every Application",
    excerpt: "A generic resume feels efficient, but in a competitive market it can quietly cost you interviews. Here's why tailoring matters.",
    category: "Resumes",
    author: "ApplyHQ",
    publishDate: "30 May 2026",
    readingTime: "8 min read",
    image: "/blog/hidden-cost-same-resume.png",
    imageAlt: "Professional tailoring a resume for job applications",
    sections: [
      {
        id: "same-resume-problem",
        title: "The Same Resume Problem",
        paragraphs: [
          "There's a version of job hunting that feels productive but isn't.",
          "You've polished your resume. It looks good. It covers your experience, your skills and your accomplishments. So you start applying: one role, then five, then twenty. Same resume, different companies. It's efficient. It scales. And after a few weeks of solid effort, you've sent out sixty applications and heard back from almost no one.",
          "This is one of the most common and costly patterns in modern job searching. The problem isn't your resume. The problem is that you're using one resume as if it can speak equally well to sixty different hiring decisions. It can't.",
          "Tailoring your resume to each role isn't a nice-to-have. In the current Australian job market, it's the difference between getting interviews and wondering what you're doing wrong."
        ]
      },
      {
        id: "why-generic-feels-right",
        title: "Why Sending the Same Resume Feels Like the Right Move",
        paragraphs: [
          "It's worth understanding why so many people default to the generic approach, because it genuinely feels logical.",
          "You've invested time building a strong resume. It reflects your full career story. Why water it down or change it for every application? Isn't the point to show everything you've achieved?",
          "Add to that the time pressure of job searching, especially when you're out of work or managing a search alongside a full-time job, and tailoring every application starts to feel like a luxury you can't afford.",
          "But here's the catch: the time you save by not tailoring is almost always outweighed by the time you lose waiting for interviews that don't come."
        ]
      },
      {
        id: "what-happens-after-applying",
        title: "What's Actually Happening on the Other Side of Your Application",
        paragraphs: [
          "To understand why tailoring matters, it helps to know what happens when your resume lands with a recruiter or hiring manager.",
          "In a competitive market, popular roles in Australia regularly attract 200-400 applications. A recruiter managing ten open roles simultaneously might spend 20-30 seconds on an initial resume review. Some spend less.",
          "In that window, they're not reading your resume. They're scanning it. They're asking one question: is it obvious that this person can do this specific job?",
          "If the answer requires them to connect the dots, read between the lines or cross-reference your experience against the job description in their head, you've already lost them. They move on. Not because you're unqualified, but because your relevance wasn't immediately clear.",
          "A tailored resume answers the question before it's even asked."
        ]
      },
      {
        id: "real-cost-generic-resume",
        title: "The Real Cost of a Generic Resume",
        paragraphs: [
          "A generic resume costs you visibility, relevance and connection. It may be polished, but it is not necessarily persuasive for the specific role in front of you.",
          "Most employers, particularly larger organisations, use Applicant Tracking Systems to filter applications before a human reviewer ever sees them. If your resume doesn't include the right keywords for the specific role, it may not surface at all.",
          "Even after passing through an ATS, your resume lands in front of a person trying to build a mental picture of you as a candidate. A resume that speaks directly to their role, team and industry creates a much stronger connection than one that reads like a general career summary."
        ],
        bullets: [
          "Missing keywords can make a qualified candidate invisible.",
          "Misaligned achievements make your strongest experience feel less relevant.",
          "Unclear relevance forces recruiters to do the work your resume should do.",
          "Weaker ATS performance reduces your chance of being surfaced.",
          "A generic summary creates less human connection with the hiring team."
        ]
      },
      {
        id: "two-applicants",
        title: "Two Applicants, Very Different Results",
        paragraphs: [
          "Applicant A applies for 50 roles in a month. They use the same resume for every application, maybe swapping the job title in their summary occasionally. Their applications go out quickly. Some days they send ten in an hour.",
          "Applicant B applies for 10 roles in the same month. For each one, they spend 20-30 minutes reviewing the job description, adjusting their resume summary, reordering their most relevant achievements and aligning their language with the role.",
          "At the end of the month, Applicant A has sent five times as many applications. Applicant B, with one-fifth the volume, is statistically likely to secure more interviews.",
          "Why? Because hiring is not a lottery where volume determines probability. It's a matching exercise. A tailored application that clearly demonstrates fit will outperform a generic one in almost every competitive situation.",
          "Applicant A is investing time in applying. Applicant B is investing time in being selected."
        ]
      },
      {
        id: "tailoring-mistakes",
        title: "Common Tailoring Mistakes to Avoid",
        paragraphs: [
          "Tailoring your resume is genuinely valuable, but there are wrong ways to do it.",
          "The goal is to make your experience more relevant and easier to understand. It is not to overload the page with keywords or copy the job ad back to the employer."
        ],
        bullets: [
          "Keyword stuffing: using terms from the job description even when they are not accurate or natural.",
          "Rewriting everything: creating a new resume from scratch for every application.",
          "Copying the job ad: mirroring the wording so closely that your resume feels hollow.",
          "Using AI without review: accepting output that is inaccurate, generic or unlike your real voice."
        ]
      },
      {
        id: "better-approach",
        title: "A Better Approach to Resume Tailoring",
        paragraphs: [
          "Effective tailoring doesn't require starting from scratch every time. It means making targeted adjustments that help a recruiter quickly understand why you fit this specific role."
        ],
        bullets: [
          "Start with a master resume that includes your full work history, achievements, skills, certifications and education.",
          "Tailor the summary first because it is often the first thing a recruiter reads.",
          "Reorder your achievements so the most relevant examples appear early.",
          "Align your language with the job description where it accurately reflects your experience.",
          "Trim details that do not serve the application."
        ]
      },
      {
        id: "ai-can-help",
        title: "How AI Can Accelerate the Tailoring Process",
        paragraphs: [
          "Used well, AI is genuinely useful for resume tailoring, not because it does the thinking for you, but because it reduces the friction of the process.",
          "AI tools can help identify which keywords and phrases from a job description are missing from your resume. They can suggest ways to reframe an achievement to better match what a role is looking for. They can help tighten language that's too vague or too task-focused.",
          "The key is staying in the driver's seat. Use AI to speed up and improve your tailoring process, but always review the output with your own judgement and make sure the final version sounds like you."
        ]
      },
      {
        id: "action-plan",
        title: "Your 5-Step Resume Tailoring Action Plan",
        paragraphs: [
          "If you want to start tailoring more effectively right now, use this simple process on your next application."
        ],
        bullets: [
          "Read the job description carefully and identify the two or three outcomes the role is expected to deliver.",
          "Pull out your master resume and choose the achievements most relevant to this role.",
          "Rewrite your summary in two to three sentences for this employer and role.",
          "Reorder and adjust your experience so the strongest relevant examples come first.",
          "Do a final relevance check from the recruiter's point of view."
        ]
      },
      {
        id: "staying-organised",
        title: "Staying Organised Across Multiple Applications",
        paragraphs: [
          "One challenge of tailoring is keeping track of which version of your resume you've sent to which employer. If you're managing ten active applications across different roles and industries, it's easy to lose track.",
          "This is where having a proper system matters. ApplyHQ is built for exactly this kind of organised, strategic job search. It helps you tailor resumes to specific roles, track every application across your pipeline and manage the full process from first application to final offer.",
          "If you're serious about your job search, a career command centre beats a spreadsheet every time."
        ]
      },
      {
        id: "frequently-asked-questions",
        title: "Frequently Asked Questions",
        paragraphs: [
          "How much should I tailor my resume for each job application? You don't need to rewrite your entire resume for every role. Focus on the sections with the highest impact: your professional summary, your top achievements and the language you use to describe your skills and experience.",
          "Should every application have a different resume? Yes, but not a completely different one. Start with a strong master resume and make deliberate adjustments for each role.",
          "Do ATS systems really matter for Australian job seekers? Yes. Most medium-to-large Australian employers use some form of ATS to manage application volumes. Relevant keywords, clean formatting and aligned language all help.",
          "Can AI tailor resumes effectively? AI can help identify keyword gaps, improve language and speed up adjustments. It works best as a support tool, not a replacement for your own judgement.",
          "How do I keep track of different resume versions across multiple applications? A dedicated job search management tool makes it easier to track which version you sent, to whom and when."
        ]
      }
    ]
  },
  {
    slug: "chatgpt-vs-claude-vs-applyhq-job-search",
    title: "ChatGPT vs Claude vs ApplyHQ: Which One Should You Use For Your Job Search?",
    excerpt: "ChatGPT, Claude and ApplyHQ solve different job search problems. Here's where each tool fits, and why the best approach often uses them together.",
    category: "Career Growth",
    author: "ApplyHQ",
    publishDate: "30 May 2026",
    readingTime: "9 min read",
    image: "/blog/chatgpt-vs-claude-vs-applyhq.png",
    imageAlt: "Career technology tools compared for job seekers",
    sections: [
      {
        id: "which-tool-should-you-use",
        title: "Which Tool Should You Use?",
        paragraphs: [
          "If you've been job hunting recently, you've almost certainly turned to AI at some point.",
          "Maybe you asked ChatGPT to help you rewrite a resume bullet point. Maybe you used Claude to draft a cover letter at 11pm when you had a deadline the next morning. Maybe you've experimented with both across half a dozen applications and still feel like something's missing from the process.",
          "AI has genuinely changed how people approach job searching. These tools are powerful, fast and accessible in a way that professional career coaching never was.",
          "But the question of which tool to use is slightly the wrong one. ChatGPT, Claude and a dedicated career platform like ApplyHQ aren't really competing with each other. They solve different problems at different stages of the job search process."
        ]
      },
      {
        id: "what-chatgpt-does-well",
        title: "What ChatGPT Does Well",
        paragraphs: [
          "ChatGPT is a genuinely impressive AI assistant for job seekers, particularly in the early and middle stages of a search.",
          "Where ChatGPT shines is flexibility. It can do many things reasonably well across a wide range of tasks. That versatility is also its limitation when it comes to job searching."
        ],
        bullets: [
          "Brainstorming how to position a career change or complex background.",
          "Suggesting resume improvements and stronger bullet points.",
          "Drafting a first version of a cover letter quickly.",
          "Simulating interview questions and giving feedback on STAR answers.",
          "Offering quick perspectives on salary negotiation, career gaps or offer decisions."
        ]
      },
      {
        id: "what-claude-does-well",
        title: "What Claude Does Well",
        paragraphs: [
          "Claude is another large language model AI assistant, developed by Anthropic. In a job search context, it has some strengths that are worth knowing about.",
          "Like ChatGPT, Claude is a conversation-based tool. You bring the task, it helps you execute it. There's no persistent record of previous applications and no workflow that connects one task to the next."
        ],
        bullets: [
          "Long-form writing that needs a structured and natural tone.",
          "Detailed resume reviews and document analysis.",
          "Selection criteria responses for public sector, university or large organisation roles.",
          "Comparing multiple document versions or working through a lengthy position description.",
          "Writing thoughtful LinkedIn summaries or personal statements."
        ]
      },
      {
        id: "where-ai-chat-breaks-down",
        title: "Where AI Chat Tools Start to Break Down",
        paragraphs: [
          "Both ChatGPT and Claude are excellent AI assistants. But when you look at the full arc of a serious job search lasting weeks or months, significant limitations start to show up.",
          "This isn't a failure of AI. It's a structural limitation. AI chat tools are built to help you do tasks. They're not built to manage a complex, multi-week process with dozens of moving parts."
        ],
        bullets: [
          "You start from scratch every time and re-explain your background over and over.",
          "There is no application tracking or pipeline view.",
          "Multiple resume versions quickly become difficult to manage.",
          "There is no career profile that improves as your search progresses.",
          "There is no workflow for research, shortlisting, applying, follow-up, interview prep and negotiation."
        ]
      },
      {
        id: "hidden-cost-ai-only",
        title: "The Hidden Cost of Relying Only on AI Chat Tools",
        paragraphs: [
          "Imagine you've been searching for three months. You've had conversations across multiple ChatGPT sessions and a few Claude chats. You've generated dozens of cover letter drafts, resume variations and interview prep notes.",
          "Where is all of that now? Probably scattered across browser tabs, downloads folders and chat histories, if you can find it at all.",
          "Meanwhile, you're not sure which version of your resume is current. You've sent similar cover letters to different companies but can't remember what you said to whom. A recruiter calls about an application you submitted four weeks ago and you spend the first few minutes trying to remember which role it was."
        ]
      },
      {
        id: "what-career-platform-does",
        title: "What a Dedicated Career Platform Does Differently",
        paragraphs: [
          "A career platform isn't primarily a writing tool. It's organisational and strategic infrastructure for your entire job search, from the first role you shortlist to the offer you accept.",
          "This is where a tool like ApplyHQ operates in a fundamentally different space."
        ],
        bullets: [
          "A centralised career profile that you build once and draw from throughout your search.",
          "Application tracking with dates, statuses, resume versions and next actions.",
          "Resume version management so you know which document went where.",
          "Job pipeline management that lets you see your whole search at a glance.",
          "Interview preparation connected to the specific role, job description and tailored application.",
          "Career transition support for redundancy, industry shifts or returning after a break."
        ]
      },
      {
        id: "two-candidates",
        title: "Two Candidates, 90 Days",
        paragraphs: [
          "Candidate A uses only ChatGPT throughout their search. They use it thoughtfully for cover letters and interview answers, but their applications are inconsistent. They're not sure which resume version they sent to which company. Follow-ups slip. Their search feels busy but not particularly strategic.",
          "Candidate B uses ChatGPT for writing tasks and a career platform for everything else. Their career profile is built out. Every application is tracked. Each tailored resume is saved against the role it was sent to. They know exactly where each application stands.",
          "The tools are different. The outcomes are different."
        ]
      },
      {
        id: "when-to-use-each-tool",
        title: "When to Use Each Tool",
        paragraphs: [
          "The smartest job seekers aren't choosing between AI chat tools and a career platform. They're using each tool for what it does best."
        ],
        bullets: [
          "Use ChatGPT for quick drafts, brainstorming, interview practice and improving specific resume bullet points.",
          "Use Claude for detailed selection criteria, long-form writing, full document reviews and nuanced analysis.",
          "Use ApplyHQ to track applications, manage resume versions, see your full pipeline and prepare for interviews with structure tied to each role."
        ]
      },
      {
        id: "complementary-not-competing",
        title: "The Best Approach: Complementary, Not Competing",
        paragraphs: [
          "Think of ChatGPT or Claude as your writing and thinking tools. They help you produce better output, faster.",
          "Think of ApplyHQ as your career operating system: the infrastructure that organises everything, connects the dots and keeps your search moving forward with clarity and momentum.",
          "A well-written cover letter sent through a chaotic, untracked process is still less effective than it could be. A well-organised job search that produces mediocre application documents will also fall short. Quality output managed through a quality system is where consistently good results come from."
        ]
      },
      {
        id: "frequently-asked-questions",
        title: "Frequently Asked Questions",
        paragraphs: [
          "Is ApplyHQ powered by AI? ApplyHQ incorporates AI to help with tasks like resume tailoring and application preparation, but it's built around a career management workflow that goes beyond what an AI chat tool offers.",
          "Can I still use ChatGPT alongside ApplyHQ? Absolutely. Many ApplyHQ users use ChatGPT or Claude for specific writing tasks and manage tracking, organisation, pipeline management and interview prep through ApplyHQ.",
          "Can I still use Claude alongside ApplyHQ? Yes. Claude is particularly useful for detailed document analysis, long-form writing and selection criteria drafting.",
          "Is ApplyHQ replacing AI tools? No. ApplyHQ solves a different problem: the organisational, strategic and workflow challenges of running a serious job search over weeks or months.",
          "Why not just build my own prompts and manage everything in a spreadsheet? You can, but there is a real cost to building and maintaining that system yourself. A purpose-built career platform gives you a workflow designed around how job searching actually works."
        ]
      },
      {
        id: "bottom-line",
        title: "The Bottom Line",
        paragraphs: [
          "ChatGPT is a powerful tool for job seekers. So is Claude. If you're not using either of them, you're probably working harder than you need to on writing tasks that AI handles well.",
          "But neither of them is a career management system. They don't remember your history, track your applications, manage your pipeline or give you a strategic overview of where your search stands.",
          "If your job search is serious, whether you're navigating a redundancy, making a career change or simply ready for something better, you need more than a fast writing tool. You need a system.",
          "Use the AI tools for what they're great at. Use ApplyHQ for everything else. That combination is hard to beat."
        ]
      }
    ]
  },
  {
    slug: "how-to-tailor-your-resume-for-each-job",
    title: "How to Tailor Your Resume for Each Job Without Starting From Scratch",
    excerpt: "A practical system for turning one strong master resume into targeted applications that feel specific, relevant and easy to send.",
    category: "Resumes",
    author: "ApplyHQ Team",
    publishDate: "30 May 2026",
    readingTime: "6 min read",
    image: "/landing/job-seeker-laptop.jpg",
    imageAlt: "Job seeker working on a laptop",
    sections: [
      {
        id: "start-with-master-resume",
        title: "Start With a Strong Master Resume",
        paragraphs: [
          "Tailoring works best when your base document already contains the right raw material. Keep a master resume with your full experience, achievements, tools, projects and measurable outcomes.",
          "The goal is not to send this version. The goal is to make sure every future application has enough evidence to draw from."
        ],
        bullets: [
          "Keep achievements specific and measurable where possible.",
          "Include alternate wording for common skills in your field.",
          "Group older or less relevant experience so it is easy to shorten."
        ]
      },
      {
        id: "read-the-job-ad",
        title: "Read the Job Ad Like a Selection Criteria",
        paragraphs: [
          "Before editing, scan the job ad for repeated responsibilities, required tools and the language used to describe success in the role.",
          "Your tailored resume should mirror the role's priorities without copying the ad word for word."
        ]
      },
      {
        id: "make-targeted-edits",
        title: "Make Targeted Edits",
        paragraphs: [
          "Focus on the summary, recent experience bullets and skills section first. Those areas usually carry the most weight for both recruiters and screening systems.",
          "Small changes can make a large difference when they help the reader quickly see why your background matches this specific role."
        ],
        bullets: [
          "Move the most relevant achievements higher.",
          "Use job-ad language naturally in your skills and experience.",
          "Remove details that distract from the role you are applying for."
        ]
      }
    ]
  },
  {
    slug: "job-search-system-that-keeps-you-organised",
    title: "A Simple Job Search System That Keeps You Organised",
    excerpt: "How to track roles, follow-ups, documents and outcomes without turning your job search into another full-time job.",
    category: "Job Search",
    author: "ApplyHQ Team",
    publishDate: "28 May 2026",
    readingTime: "5 min read",
    image: "/landing/team-laptop.jpg",
    imageAlt: "People reviewing work together on a laptop",
    sections: [
      {
        id: "track-every-role",
        title: "Track Every Role From the Start",
        paragraphs: [
          "The easiest application to lose is the one you were excited about yesterday. Capture each role as soon as you decide it is worth exploring.",
          "At minimum, track the company, job title, link, application status, date applied and next follow-up."
        ]
      },
      {
        id: "separate-status-from-notes",
        title: "Separate Status From Notes",
        paragraphs: [
          "Status tells you where an application sits. Notes tell you what to do next. Keeping them separate makes your dashboard easier to scan."
        ],
        bullets: [
          "Use status for pipeline movement.",
          "Use notes for recruiter names, salary details and reminders.",
          "Keep interview preparation attached to the relevant role."
        ]
      }
    ]
  },
  {
    slug: "cover-letter-that-does-not-sound-generic",
    title: "How to Write a Cover Letter That Does Not Sound Generic",
    excerpt: "A modern cover letter should connect your experience to the role quickly, clearly and without filler.",
    category: "Cover Letters",
    author: "ApplyHQ Team",
    publishDate: "26 May 2026",
    readingTime: "4 min read",
    image: "/landing/hero-job-seeker.png",
    imageAlt: "Professional reviewing career documents",
    sections: [
      {
        id: "lead-with-fit",
        title: "Lead With Fit",
        paragraphs: [
          "Open with the connection between your experience and the role. Avoid broad statements about being passionate or hardworking unless they are backed by evidence."
        ]
      },
      {
        id: "show-role-awareness",
        title: "Show Role Awareness",
        paragraphs: [
          "Reference the problems the role appears to solve. This shows that you understand the job, not just the company name."
        ]
      }
    ]
  },
  {
    slug: "prepare-star-answers-before-interview",
    title: "Prepare Better STAR Answers Before Your Next Interview",
    excerpt: "Turn your experience into clear, confident stories that help interviewers understand how you work.",
    category: "Interviews",
    author: "ApplyHQ Team",
    publishDate: "24 May 2026",
    readingTime: "7 min read",
    image: "/landing/job-seeker-laptop.jpg",
    imageAlt: "Candidate preparing interview notes",
    sections: [
      {
        id: "choose-the-right-stories",
        title: "Choose the Right Stories",
        paragraphs: [
          "Strong STAR answers begin before the interview. Pick examples that match the role's responsibilities, seniority and working environment."
        ],
        bullets: [
          "One story about solving a difficult problem.",
          "One story about influencing stakeholders.",
          "One story about improving a process or outcome."
        ]
      },
      {
        id: "keep-the-result-clear",
        title: "Keep the Result Clear",
        paragraphs: [
          "The result is what makes your answer memorable. Use numbers, decisions, feedback or business outcomes where you can."
        ]
      }
    ]
  },
  {
    slug: "what-to-do-after-redundancy",
    title: "What to Do in the First Week After Redundancy",
    excerpt: "A calm, practical checklist for protecting your energy, updating your story and restarting your search.",
    category: "Redundancy Support",
    author: "ApplyHQ Team",
    publishDate: "22 May 2026",
    readingTime: "6 min read",
    image: "/landing/team-laptop.jpg",
    imageAlt: "Career transition planning at a laptop",
    sections: [
      {
        id: "pause-before-applying",
        title: "Pause Before Applying Everywhere",
        paragraphs: [
          "It is natural to want momentum immediately, but the first week is also the right time to reset your positioning.",
          "Update your resume, decide what roles you want next and prepare a simple explanation for your transition."
        ]
      },
      {
        id: "build-a-shortlist",
        title: "Build a Focused Shortlist",
        paragraphs: [
          "Aim for quality over volume. A smaller list of aligned roles gives you more time to tailor each application and prepare well."
        ]
      }
    ]
  },
  {
    slug: "how-to-compare-job-offers",
    title: "How to Compare Job Offers Beyond Salary",
    excerpt: "Salary matters, but the best offer is usually the one that fits your goals, lifestyle and growth path.",
    category: "Salary & Offers",
    author: "ApplyHQ Team",
    publishDate: "20 May 2026",
    readingTime: "5 min read",
    image: "/landing/hero-job-seeker.png",
    imageAlt: "Professional comparing job offers",
    sections: [
      {
        id: "compare-total-package",
        title: "Compare the Total Package",
        paragraphs: [
          "Base salary is only one part of an offer. Consider superannuation, bonus structure, flexibility, leave, commute, learning budget and role scope."
        ]
      },
      {
        id: "look-at-growth",
        title: "Look at Growth Potential",
        paragraphs: [
          "A slightly lower offer can still be stronger if it gives you better experience, a healthier environment or a clearer path to your next step."
        ]
      }
    ]
  }
];

export function getFeaturedArticle() {
  return blogArticles.find((article) => article.featured) ?? blogArticles[0];
}

export function getArticleBySlug(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function getRelatedArticles(article: BlogArticle, limit = 3) {
  const sameCategory = blogArticles.filter((item) => item.slug !== article.slug && item.category === article.category);
  const fallback = blogArticles.filter((item) => item.slug !== article.slug && item.category !== article.category);
  return [...sameCategory, ...fallback].slice(0, limit);
}
