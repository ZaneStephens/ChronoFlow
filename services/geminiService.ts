import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateSubtasks = async (taskTitle: string, taskDescription: string): Promise<{ title: string }[]> => {
  const ai = getAiClient();
  
  const prompt = `
    You are an expert IT Support Professional specializing in the Microsoft Stack (Azure, Microsoft 365, Intune, Windows Server, PowerShell).
    Break down the following task into 3 to 6 actionable, technical subtasks - the first task should ideally point to a microsoft learn link that covers the issue, for this you will need to perform a search and provide a working link.
    
    Task: ${taskTitle}
    Description: ${taskDescription}
    
    Return ONLY a raw JSON array of objects with a 'title' property. 
    Example: [{"title": "Check Entra ID sync logs"}, {"title": "Update GPO configurations"}, {"title": "Run PowerShell script to verify users"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [];
  }
};

export const generateClientReport = async (
  clientName: string, 
  startDate: string, 
  endDate: string, 
  items: { title: string; durationMinutes: number; status: string; notes: string[] }[]
) => {
  const ai = getAiClient();
  
  const itemsSummary = items.map(t => {
    const notesSummary = t.notes.length > 0 ? `\n    - Activity Notes: ${t.notes.join('; ')}` : '';
    return `- ${t.title} (${t.durationMinutes} mins) [Status: ${t.status}]${notesSummary}`;
  }).join('\n');
  
  const totalMinutes = items.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const prompt = `
    You are an expert IT Consultant generating a formal status report email for a client.
    
    Client: ${clientName}
    Period: ${startDate} to ${endDate}
    Total Time Logged: ${totalHours} hours
    
    Work Items Completed:
    ${itemsSummary}
    
    Task: Write a professional, polite, and clear email report summarizing the work completed during this period.
    
    Guidelines:
    - Start with a polite greeting and a summary of the total time spent.
    - Group related items logically (e.g. "Server Maintenance", "User Support") if possible, rather than just listing them chronologically.
    - Use the "Activity Notes" provided to add context to what was actually done, but summarize them professionally.
    - Highlight any resolved tickets or completed tasks clearly.
    - The tone should be professional, helpful, and concise, suitable for a freelance IT expert communicating with a business client.
    - Sign off as "ChronoFlow IT Services".
    - Do not use placeholders like "[Your Name]".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Report Error:", error);
    return "Error generating report. Please check your API key and Internet connection.";
  }
};

export const generateTaskReport = async (
  taskTitle: string,
  taskDescription: string,
  status: string,
  totalHours: string,
  subtasks: { title: string; isCompleted: boolean }[],
  workLogs: { date: string; durationMinutes: number; notes: string }[]
) => {
  const ai = getAiClient();

  const subtaskSummary = subtasks.map(s => `- [${s.isCompleted ? 'x' : ' '}] ${s.title}`).join('\n');
  const logSummary = workLogs.map(l => `- ${l.date} (${l.durationMinutes}m): ${l.notes}`).join('\n');

  const prompt = `
    You are an expert IT Consultant generating a detailed progress report for a specific technical task.

    Task: ${taskTitle}
    Description: ${taskDescription || 'N/A'}
    Current Status: ${status}
    Total Time Logged: ${totalHours} hours

    Subtasks Breakdown:
    ${subtaskSummary || 'No subtasks defined.'}

    Work History (Chronological):
    ${logSummary || 'No time logs recorded for this period.'}

    Task: Write a detailed technical summary report for this task.
    
    Guidelines:
    - Summarize the overall progress and current state of the task.
    - Highlight completed subtasks and any outstanding work.
    - Analyze the work history to provide a narrative of what was done, referencing specific technical details found in the notes.
    - Identify any potential blockers or areas requiring attention based on the notes.
    - Tone: Professional, technical, and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Task Report Error:", error);
    return "Error generating task report.";
  }
};