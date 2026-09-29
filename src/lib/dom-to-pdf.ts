import html2pdf from 'html2pdf.js';

export async function downloadDomAsPdf(elementId: string, filename: string = "Report.pdf") {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  // 1. Wait for fonts to be fully loaded
  await document.fonts.ready;

  // 2. Measure the exact rendered live DOM element
  const width = element.scrollWidth;
  const height = element.scrollHeight;

  // 3. Configure html2pdf options
  const opt = {
    margin:       0, // No external margins; the modal's internal padding is preserved
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true,
      logging: false,
      width: width,
      height: height,
      windowWidth: width,
      windowHeight: height,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { 
      unit: 'px', 
      format: [width, height + 10], 
      orientation: 'portrait',
      hotfixes: ["px_scaling"]
    }
  };

  // 4. Generate and save the PDF directly from the exact rendered content
  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("PDF generation failed:", error);
  }
}
