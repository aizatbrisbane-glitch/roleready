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
    slug: "fastest-way-to-lose-a-high-performer",
    title: "The Fastest Way to Lose a High Performer",
    excerpt: "Losing a good employee rarely looks dramatic. It is a slow drift, over months, from fully switched on to just going through the motions. Here is what that looks like from the inside.",
    category: "Career Growth",
    author: "Koalapply",
    publishDate: "3 Jul 2026",
    readingTime: "6 min read",
    image: "/blog/fastest-way-to-lose-high-performer.jpg",
    imageAlt: "High performer reflecting on their career trajectory",
    featured: true,
    sections: [
      {
        id: "intro",
        title: "",
        paragraphs: [
          "You already know if you are a high performer. Nobody has to tell you in a performance review. You know because you are the one who catches what everyone else missed, the one who stays fifteen minutes late so the deck actually makes sense, the one whose name ends up attached to anything that needs someone reliable on it.",
          "What you are less sure of is whether anyone has actually noticed.",
          "That is the part most companies get wrong, and not occasionally. Consistently. Losing a good employee rarely looks dramatic from the outside. There is no blow-up, no scene in the break room, no dramatic resignation letter. It is quieter than that: a slow drift, over months, from fully switched on to just going through the motions, long before anyone hands in their notice.",
          "Here is what that drift usually looks like from the inside, and what is worth doing if you are somewhere in the middle of it right now.",
        ],
      },
      {
        id: "useful-instead-of-valued",
        title: "It Starts With Being Useful Instead of Valued",
        paragraphs: [
          "The fastest way a company loses someone good is by treating them as a solution to problems instead of a person with a career. You get handed the messy account, the underperforming team, the project nobody else wants, because everyone knows you will actually deliver. That is not nothing. Being trusted with hard things is real, and it feels good, at least at first.",
          "But being trusted with hard things and being valued for them are not the same. One shows up in what you are handed. The other shows up in pay reviews, promotions, and someone occasionally asking what you actually want next. When only the first one is happening, you end up carrying more responsibility every year while your title quietly stays put.",
          "If your workload keeps growing and your role on paper has not moved in a while, that is not a coincidence. That is the pattern.",
        ],
      },
      {
        id: "recognition-goes-to-loudest",
        title: "Recognition Goes to Whoever Talks About It Loudest",
        paragraphs: [
          "Most workplaces are not actually built to notice quiet excellence. They notice noise. The person who mentions their wins in every meeting tends to get remembered over the person who just delivers and moves on to the next thing. It is not fair, and it is not really about merit either. It is about visibility.",
          "If you have spent years assuming good work speaks for itself, it is worth asking honestly whether it is actually being heard, or just being consumed.",
        ],
      },
      {
        id: "feedback-two-way",
        title: "Feedback Stops Being a Two-Way Thing",
        paragraphs: [
          "Early on, feedback usually flows both directions. Someone checks in, asks how the role is going, takes your input on what could run better. Then, gradually, it starts flowing one way only. You are told what needs fixing. Nobody is asking what is draining you, or what would actually make the next twelve months better for you.",
          "That shift matters, not because feedback stopped, but because it stopped being a conversation.",
        ],
      },
      {
        id: "what-to-do",
        title: "What to Actually Do About It",
        paragraphs: [
          "None of this is a reason to spiral, and it is not a reason to quit on impulse either. It is a reason to get deliberate.",
          "Name it honestly, to yourself, first. Not \"I am probably being dramatic,\" and not \"everyone feels like this sometimes.\" Look at the actual facts. What have you delivered in the last twelve months, and what has changed for you as a result? If the answer is \"a lot\" and \"not much,\" that is data, not drama.",
          "Have the direct conversation before the exit conversation. A surprising number of managers genuinely do not know how a good employee is feeling, simply because nobody has told them plainly. Ask for what you actually want: a title conversation, a pay review, a change in scope, rather than hinting and hoping it gets noticed. A real answer, one way or the other, will come quickly. A vague \"let us revisit this soon\" is an answer too.",
          "Keep a record of your own impact. Not for anyone else, for you. Most high performers undersell their own case because they are too close to the work to see its shape from the outside. Write down what you actually did, not just what you were assigned. It is useful twice over: once for the conversation you are about to have, and once for the resume you might need sooner than you think.",
          "Decide what you are actually optimising for. More money, more scope, more recognition, more sanity: these are not the same thing, and chasing all four at once usually gets you none of them. Knowing which one matters most right now changes what you ask for, and what you are willing to walk away from.",
          "Do not wait for the breaking point before you start looking. The best time to explore the market is before you are desperate, not after. A calm, well-prepared search where you are choosing between options feels completely different from a rushed one where you are just trying to escape, and it tends to land you somewhere better. Give yourself the runway.",
        ],
      },
      {
        id: "if-conversation-doesnt-land",
        title: "If the Conversation Does Not Land",
        paragraphs: [
          "Sometimes you have the honest conversation and nothing changes. That is useful information too. It tells you the appreciation gap is not an oversight, it is the culture. At that point, staying quiet and hoping it improves is usually the more expensive option, even if it feels like the safer one.",
          "If that is where you have landed, the work shifts from advocating internally to positioning yourself externally. That takes a different skill: translating what you have actually done into language that lands with a hiring manager who has never met you and has thirty seconds to decide if you are worth a second look.",
        ],
      },
      {
        id: "koalapply-cta",
        title: "Just Koalapply!",
        paragraphs: [
          "This is exactly the moment Koalapply is built for. When you decide your work deserves to be recognised somewhere else, Koalapply helps you explain what you have done clearly and confidently.",
          "Upload your resume, add the job ad, and Koalapply helps tailor your resume and cover letter to what the employer is actually looking for. It also keeps your applications organised, so you know what you applied for and where things stand.",
          "Let us help you with your first application for free!",
        ],
      },
    ],
  },
  {
    slug: "show-what-good-looks-like",
    title: "Real Leaders Show What Good Looks Like",
    excerpt: "Real leadership is not a position. It is a practice. And the most effective leaders do not just set the standard. They live it.",
    category: "Career Growth",
    author: "Koalapply",
    publishDate: "23 Jun 2026",
    readingTime: "6 min read",
    image: "/blog/show-what-good-looks-like.jpg",
    imageAlt: "Leader demonstrating high standards through example",
    sections: [
      {
        id: "the-whole-thing",
        title: "",
        paragraphs: [
          "Ask anyone to describe the best leader they have ever worked with, and the answer is rarely about authority. It is almost never about someone who gave great speeches or held impressive titles. More often than not, it is about someone who simply held themselves to a standard, quietly and consistently, and made everyone around them want to do the same.",
          "Real leaders show what good looks like. That is the whole thing.",
          "It sounds simple because it is. But simple is not the same as easy. Leading by example requires something most leadership frameworks overlook: the willingness to be the standard you are asking others to meet. Not occasionally. Not when it is convenient. Every day, in the small moments that nobody seems to notice but everyone somehow remembers.",
        ],
      },
      {
        id: "nobody-is-watching",
        title: "Nobody Is Watching. Everyone Is Watching.",
        paragraphs: [
          "Here is the uncomfortable truth about professional behaviour: people notice everything, even when they say nothing.",
          "The way you respond to a last-minute request. Whether you give credit or quietly absorb it. How you behave in a meeting when things are not going your way. Whether you do the unglamorous work without being asked. These moments feel small and ordinary, but they accumulate into something that defines how others experience working with you.",
          "Leadership is often thought of as something that happens from the top down. But real leadership is not a position. It is a practice. Culture is shaped by whoever sets the tone, and that can be anyone. A junior team member who approaches every task with care and generosity can shift the energy of an entire team. A mid-level professional who stays calm under pressure gives others permission to do the same.",
          "Real leaders do not wait for a title before they start behaving like one. They decide, early and privately, what standard they are willing to hold themselves to. And then they hold it.",
        ],
      },
      {
        id: "what-it-looks-like-day-to-day",
        title: "What Real Leadership Actually Looks Like Day to Day",
        paragraphs: [
          "Leading by example is not about being perfect. It is about being consistent. Here is what it tends to look like in practice.",
          "You do the work you ask others to do. Nothing erodes trust faster than someone who sets expectations they do not hold themselves to. If you want your team to be thorough, be thorough. If you want people to communicate clearly, communicate clearly. The standard you live is the standard that spreads.",
          "You handle hard moments with composure. Deadlines slip. Plans fall apart. People disagree. How you respond in those moments sends a louder signal than any team values document ever could. Staying level-headed when things are difficult is one of the most powerful things you can model for the people around you.",
          "You are honest, even when it is uncomfortable. People who lead by example do not pretend problems do not exist. They name them calmly, take responsibility where it is theirs, and focus on what can be done. This kind of honesty creates psychological safety. It tells people that reality is something to be faced, not managed.",
          "You invest in others without keeping score. Sharing knowledge, making time for questions, advocating for someone who deserves recognition. These are not extras. They are the substance of what it means to show good.",
        ],
      },
      {
        id: "the-career-case",
        title: "The Career Case for Leading by Example",
        paragraphs: [
          "Beyond the team dynamics, there is a very practical reason to care about this: it is one of the things that gets noticed most when people advance.",
          "Promotions and senior opportunities rarely go to the person who simply did their job well. They go to the person who made the people around them better. Who created an environment where good work could happen. Who demonstrated, through their actions, that they could be trusted with more responsibility.",
          "When you lead by example consistently, you build a reputation that is almost impossible to manufacture through any other means. Former managers remember you. Colleagues advocate for you. Opportunities find you because people want to work with you again.",
          "It is one of the slowest-building career assets, and one of the most durable.",
        ],
      },
      {
        id: "a-question-worth-sitting-with",
        title: "A Question Worth Sitting With",
        paragraphs: [
          "Think about the best professional you have ever worked with. Not the smartest, not the most technically gifted, but the one who made you better at your job just by being around them.",
          "What did they actually do? Chances are it was not one big thing. It was a hundred small things done consistently and without fanfare. They showed up prepared. They treated people well. They cared about the quality of their work in a way that made you care more about yours.",
          "That is the person you are trying to become. And the good news is that it does not require a personality overhaul or a management role. It requires intention. A decision, made quietly and repeatedly, to hold yourself to the standard you would want others to hold themselves to.",
          "That is what real leadership looks like from the inside.",
        ],
      },
      {
        id: "bring-that-standard-to-your-job-search",
        title: "Bring That Same Standard to Your Job Search",
        paragraphs: [
          "The same instinct that makes someone a great professional, caring about quality, being specific and honest, showing rather than telling, is exactly what makes a great job application.",
          "Koalapply helps you translate who you actually are at work into language that lands. Tailored resumes and cover letters that reflect the real standard you bring, not a generic version of you.",
          "Because the best applications do not just describe what you have done. They show what good looks like.",
        ],
      },
    ],
  },
  {
    slug: "your-reputation-is-not-on-your-cv",
    title: "Your Reputation Is Not on Your CV",
    excerpt: "Your CV gets you considered. Your reputation gets you hired. Here's how to make sure both are working for you.",
    category: "Career Growth",
    author: "Koalapply",
    publishDate: "23 Jun 2026",
    readingTime: "5 min read",
    image: "/blog/reputation-cv.png",
    imageAlt: "Professional reflecting on their career reputation",
    sections: [
      {
        id: "beyond-the-resume",
        title: "",
        paragraphs: [
          "There's a version of you that exists beyond the borders of your resume. A version that your former colleagues talk about when your name comes up. A version that lives in Slack messages, LinkedIn recommendations, and the memory of every manager you've ever had.",
          "That version, your professional reputation, is doing more work in your job search than you probably realise.",
        ],
      },
      {
        id: "cv-gets-you-considered",
        title: "The CV Gets You Considered. Your Reputation Gets You Hired.",
        paragraphs: [
          "Hiring managers shortlist based on what's written on the page. But when the decision comes down to two equally qualified candidates? They call someone who knows you.",
          "This is not an exaggeration. Informal reference checks happen constantly, often before the formal stage. A hiring manager might message a mutual contact on LinkedIn, ask a colleague who used to work at your old company, or simply Google your name to see what comes up. By the time you're sitting in the interview, a version of your reputation has often already arrived before you.",
          "Your CV opens doors. Your reputation decides whether you walk through them.",
        ],
      },
      {
        id: "what-reputation-is-made-of",
        title: "What Your Reputation Is Actually Made Of",
        paragraphs: [
          "Most people think of reputation as something abstract, a feeling others have about you. But in a professional context, it's actually quite specific. It's made up of how you showed up over time.",
          "Did you deliver? Reputation is built on outcomes. Not just completing tasks, but being the kind of person people could rely on to follow through, even when things got hard.",
          "How did you treat people? Competence without character gets noticed, and not in the right way. The way you treated junior team members, how you handled conflict, whether you gave credit generously. These things stick in people's memories far longer than any project you shipped.",
          "Were you easy to work with? This sounds soft, but it's decisive. Employers want skilled people who don't create drag. If working with you made people feel energised and supported, that reputation will precede you.",
          "What do you stand for? People with a clear point of view, a perspective on their industry, a way of working, a visible area of expertise, are far more memorable than those who simply do their job and go home.",
        ],
      },
      {
        id: "quiet-gap",
        title: "The Quiet Gap Most Job Seekers Ignore",
        paragraphs: [
          "Here's what tends to happen: someone spends hours perfecting their resume, tailoring their cover letter, and preparing for interview questions. Then neglects the part of the process that actually builds long-term career leverage.",
          "Reputation compounds. Every interaction, every piece of work, every conversation either adds to it or chips away at it. And unlike a CV, which you update every few years, your reputation is being written in real time, even when you're not looking for a job.",
          "The people who find great opportunities most consistently aren't always the best on paper. They're often the people who have invested in being genuinely good to work with, generous with their knowledge, and present in their professional communities.",
        ],
      },
      {
        id: "what-you-can-do-now",
        title: "What You Can Do Right Now",
        paragraphs: [
          "You don't need to overhaul your personal brand or start posting daily on LinkedIn. Reputation-building is quieter than that.",
          "Reach back out. Contact two or three former colleagues you genuinely liked working with. Not to ask for a favour, just to reconnect. Strong professional relationships are the infrastructure your reputation travels on.",
          "Make your expertise visible. Share something useful in your field: a perspective, a lesson learned, a resource. You don't need a large audience. Even a handful of relevant people seeing your thinking is enough to shift how you're perceived.",
          "Think about what people say when you're not in the room. Seriously ask yourself: what would a former manager say about working with you? If the honest answer is \"good, but...\" then that's worth sitting with.",
          "Be excellent in small moments. Reputation isn't built in big gestures. It's built in whether you respond promptly, whether you credit people properly, whether you bring energy or drain it.",
        ],
      },
      {
        id: "let-your-application-reflect-both",
        title: "Let Your Application Reflect Both",
        paragraphs: [
          "A great resume backed by a strong reputation is almost unstoppable. But it requires that both sides of the equation are working.",
          "That's where Koalapply comes in. We help you put your best professional self on paper, tailoring your resume and cover letter to each role with language that's specific, confident, and true to who you are.",
          "Because when your application lands on someone's desk and they go looking to find out more about you, you want everything they find to confirm the same story.",
        ],
      },
    ],
  },
  {
    slug: "why-youre-not-getting-interviews-even-with-experience",
    title: "Why You're Not Getting Interviews (Even With Experience)",
    excerpt: "If your inbox is quiet despite strong experience, the problem is usually not your background. It is your job search process.",
    category: "Job Search",
    author: "Koalapply",
    publishDate: "30 May 2026",
    readingTime: "9 min read",
    image: "/blog/not-getting-interviews.jpg",
    imageAlt: "Professional job seeker waiting for interview responses",
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
          "This is exactly what Koalapply is built for. It's a career command centre for Australian professionals who are serious about their search, helping you tailor resumes to specific roles, track applications across your pipeline and manage career transitions with structure that actually produces results.",
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
          "What is Koalapply? Koalapply is a career management platform designed for Australian professionals. It helps you tailor resumes to specific roles, organise and track your applications, prepare for interviews and manage career transitions all in one place."
        ]
      }
    ]
  },
  {
    slug: "hidden-cost-of-using-same-resume",
    title: "The Hidden Cost of Using the Same Resume for Every Application",
    excerpt: "A generic resume feels efficient, but in a competitive market it can quietly cost you interviews. Here's why tailoring matters.",
    category: "Resumes",
    author: "Koalapply",
    publishDate: "30 May 2026",
    readingTime: "8 min read",
    image: "/blog/hidden-cost-same-resume.jpg",
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
          "This is where having a proper system matters. Koalapply is built for exactly this kind of organised, strategic job search. It helps you tailor resumes to specific roles, track every application across your pipeline and manage the full process from first application to final offer.",
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
    slug: "chatgpt-vs-claude-vs-Koalapply-job-search",
    title: "ChatGPT vs Claude vs Koalapply: Which One Should You Use For Your Job Search?",
    excerpt: "ChatGPT, Claude and Koalapply solve different job search problems. Here's where each tool fits, and why the best approach often uses them together.",
    category: "Career Growth",
    author: "Koalapply",
    publishDate: "30 May 2026",
    readingTime: "9 min read",
    image: "/blog/chatgpt-vs-claude-vs-Koalapply.png",
    imageAlt: "Career technology tools compared for job seekers",
    sections: [
      {
        id: "which-tool-should-you-use",
        title: "Which Tool Should You Use?",
        paragraphs: [
          "If you've been job hunting recently, you've almost certainly turned to AI at some point.",
          "Maybe you asked ChatGPT to help you rewrite a resume bullet point. Maybe you used Claude to draft a cover letter at 11pm when you had a deadline the next morning. Maybe you've experimented with both across half a dozen applications and still feel like something's missing from the process.",
          "AI has genuinely changed how people approach job searching. These tools are powerful, fast and accessible in a way that professional career coaching never was.",
          "But the question of which tool to use is slightly the wrong one. ChatGPT, Claude and a dedicated career platform like Koalapply aren't really competing with each other. They solve different problems at different stages of the job search process."
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
          "This is where a tool like Koalapply operates in a fundamentally different space."
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
          "Use Koalapply to track applications, manage resume versions, see your full pipeline and prepare for interviews with structure tied to each role."
        ]
      },
      {
        id: "complementary-not-competing",
        title: "The Best Approach: Complementary, Not Competing",
        paragraphs: [
          "Think of ChatGPT or Claude as your writing and thinking tools. They help you produce better output, faster.",
          "Think of Koalapply as your career operating system: the infrastructure that organises everything, connects the dots and keeps your search moving forward with clarity and momentum.",
          "A well-written cover letter sent through a chaotic, untracked process is still less effective than it could be. A well-organised job search that produces mediocre application documents will also fall short. Quality output managed through a quality system is where consistently good results come from."
        ]
      },
      {
        id: "frequently-asked-questions",
        title: "Frequently Asked Questions",
        paragraphs: [
          "Is Koalapply powered by AI? Koalapply incorporates AI to help with tasks like resume tailoring and application preparation, but it's built around a career management workflow that goes beyond what an AI chat tool offers.",
          "Can I still use ChatGPT alongside Koalapply? Absolutely. Many Koalapply users use ChatGPT or Claude for specific writing tasks and manage tracking, organisation, pipeline management and interview prep through Koalapply.",
          "Can I still use Claude alongside Koalapply? Yes. Claude is particularly useful for detailed document analysis, long-form writing and selection criteria drafting.",
          "Is Koalapply replacing AI tools? No. Koalapply solves a different problem: the organisational, strategic and workflow challenges of running a serious job search over weeks or months.",
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
          "Use the AI tools for what they're great at. Use Koalapply for everything else. That combination is hard to beat."
        ]
      }
    ]
  },
  {
    slug: "how-to-tailor-your-resume-for-each-job",
    title: "How to Tailor Your Resume for Each Job Without Starting From Scratch",
    excerpt: "Tailoring your resume doesn't mean starting over every time. Here's a system that lets you adapt quickly — without the manual grind.",
    category: "Resumes",
    author: "Koalapply Team",
    publishDate: "30 May 2026",
    readingTime: "8 min read",
    image: "/landing/job-seeker-laptop.jpg",
    imageAlt: "Job seeker working on a laptop",
    sections: [
      {
        id: "intro",
        title: "",
        paragraphs: [
          "You've heard it a hundred times: \"Tailor your resume for every job you apply to.\" It's solid advice — recruiters and applicant tracking systems (ATS) both favour resumes that speak directly to the role. But if you're applying to ten, twenty, or fifty jobs, rewriting your resume from scratch each time isn't just tedious — it's unsustainable.",
          "The good news is that tailoring doesn't mean starting over. It means being strategic about what you change, and building a system that lets you adapt quickly. Here's how."
        ]
      },
      {
        id: "why-tailoring-matters",
        title: "Why Tailoring Actually Matters",
        paragraphs: [
          "Most companies now use an ATS to filter applications before a human ever sees them. These systems scan for keywords, skills, and phrases that match the job description. A generic resume — even a strong one — can get filtered out simply because it doesn't mirror the language of the posting.",
          "Beyond the ATS, hiring managers skim resumes in seconds. A resume that clearly reflects the role you're applying for signals that you understand the job and took the application seriously. A generic one signals the opposite, even if your experience is a great fit."
        ]
      },
      {
        id: "build-master-resume",
        title: "Step 1: Build a \"Master Resume\" First",
        paragraphs: [
          "Before you tailor anything, create one comprehensive master resume that includes everything: every role, every achievement, every skill, every metric you've got. This document is never sent to an employer — it's your source material.",
          "Think of it as a library you pull from, not a draft you edit live. Having this in place means tailoring becomes a matter of selecting and rephrasing, not writing from a blank page every time."
        ]
      },
      {
        id: "study-job-description",
        title: "Step 2: Study the Job Description Like a Checklist",
        paragraphs: [
          "Read the job posting and pull out three things:",
          "These are the words the ATS is scanning for, and they're also the words a hiring manager expects to see echoed back at them. You don't need to use every single one, but the closer your language matches theirs, the stronger your match score."
        ],
        bullets: [
          "Hard skills and tools (e.g. \"SQL,\" \"Salesforce,\" \"project management\")",
          "Soft skills and traits (e.g. \"collaborative,\" \"detail-oriented,\" \"self-starter\")",
          "Key responsibilities (the actual verbs — \"manage,\" \"lead,\" \"coordinate,\" \"analyse\")"
        ]
      },
      {
        id: "swap-the-summary",
        title: "Step 3: Swap the Summary, Not the Structure",
        paragraphs: [
          "Your resume's top section — whether it's a summary or headline — is the highest-leverage place to tailor. This is the first thing a recruiter reads, and it should immediately connect your background to the role.",
          "Instead of a generic opener like \"Experienced professional with a background in marketing,\" tailor it to the specific job: \"Marketing coordinator with 4 years' experience in content strategy and campaign analytics, specialising in B2B SaaS growth.\"",
          "This single paragraph can change every time — while the rest of your resume's structure stays exactly the same."
        ]
      },
      {
        id: "reorder-bullet-points",
        title: "Step 4: Reorder and Reframe Your Bullet Points",
        paragraphs: [
          "You don't need new achievements for every job. You need to reframe existing ones to highlight what's relevant.",
          "For example, if you managed a project that involved both budgeting and team leadership, and you're applying for a finance-focused role, lead with the budgeting outcome. If you're applying for a people-management role, lead with the leadership outcome. Same experience, different emphasis.",
          "Also consider reordering your bullet points within each role so the most relevant achievements sit at the top — that's what gets read first."
        ]
      },
      {
        id: "match-keywords-naturally",
        title: "Step 5: Match Keywords Naturally",
        paragraphs: [
          "Once you've identified keywords from Step 2, weave them into your bullet points and skills section where they genuinely apply. Don't force a skill you don't have just because it's in the posting — but if you have \"cross-functional collaboration\" and the posting says \"works well across teams,\" use their phrasing.",
          "This is less about gaming the system and more about speaking the same language as the person (or algorithm) reading your resume."
        ]
      },
      {
        id: "keep-tailoring-log",
        title: "Step 6: Keep a Tailoring Log",
        paragraphs: [
          "As you apply to more roles, you'll start noticing patterns — certain industries or job types will need similar tweaks. Keep a simple log or folder of your tailored versions so you're not reinventing the wheel each time. Over time, you'll build a set of \"modular\" summaries and bullet variations you can mix and match in minutes."
        ]
      },
      {
        id: "systemise-not-sacrifice",
        title: "The Real Time-Saver: Systemise, Don't Sacrifice Quality",
        paragraphs: [
          "The mistake most job seekers make is treating tailoring as all-or-nothing: either send the same resume everywhere, or spend an hour rewriting each one. Neither is necessary. With a master resume, a clear read of the job description, and a few targeted edits — the summary, the bullet emphasis, the keywords — you can tailor a resume in minutes rather than hours, without losing the polish or personalisation that gets you noticed."
        ]
      },
      {
        id: "let-koalapply-help",
        title: "Let Koalapply Do the Heavy Lifting",
        paragraphs: [
          "Tailoring a resume well takes a good eye for detail — and a bit of time you may not have between applications. That's exactly what Koalapply is built for.",
          "Koalapply takes your master resume and a job description, and instantly generates a tailored resume and cover letter matched to that specific role — pulling out the right keywords, reframing your achievements, and rewriting your summary, all in a fraction of the time it'd take to do manually.",
          "If you're applying to multiple roles and want every application to feel custom without the manual grind, give Koalapply a try."
        ]
      }
    ]
  },
  {
    slug: "job-search-system-that-keeps-you-organised",
    title: "A Simple Job Search System That Keeps You Organised",
    excerpt: "How to track roles, follow-ups, documents and outcomes without turning your job search into another full-time job.",
    category: "Job Search",
    author: "Koalapply Team",
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
    author: "Koalapply Team",
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
    author: "Koalapply Team",
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
    author: "Koalapply Team",
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
    author: "Koalapply Team",
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
