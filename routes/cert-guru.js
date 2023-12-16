const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('fontkit'); // Import the fontkit library
const fs = require('fs').promises;
const path = require('path');
const auth = require("./auth");

async function createSijil(sijil) {
    //nama, sekolah,pertandingan,peringkat,tempat,tarikh,kp,kodsekolah, siri_,folder
    var peringkat_ = sijil.peringkat.split('|');
    let siri = sijil.siri;
    let printsiri = siri;
    //var siri = paddedNumber;
    const pos = {
      siri: {
          y:800,
          size: 14
      },
      nama: {
          y:570,
          size: 18
      },
      sekolah: {
          y:550,
          size:16
      },
      pertandingan:{
          y:480,
          size: 20
      },
      peringkat1:{
          y:410,
          size: 20
      },
      peringkat2:{
          y:390,
          size: 20
      },
      tempat:{
          y:350,
          size: 18
      },
      tarikh:{
          y:330,
          size: 16
      }
    }
    // Load the PDF file
    const pdfData = await fs.readFile('templates/SIJIL PENYERTAAN GURU 2.pdf');
    const pdfDoc = await PDFDocument.load(pdfData);
  
    // Create a new page with the same size as the first page
    const firstPage = pdfDoc.getPages()[0];
    const pageWidth = firstPage.getWidth();
    const pageHeight = firstPage.getHeight();
    //const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
  
    // Define the text and font size
    const fontSize = 20;
    const textSiri = "No Siri: " + printsiri;
    const textNama = sijil.nama.toUpperCase();
    const textSekolah = sijil.sekolah.toUpperCase();
    const textPertandingan = sijil.pertandingan.toUpperCase();
    const textPeringkat1 = peringkat_[0].toUpperCase();
    const textPeringkat2 = peringkat_[1].toUpperCase();
    const textTempat = sijil.tempat.toUpperCase();
    const textTarikh = sijil.tarikh.toUpperCase();
  
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
  
    // Embed the Arial font
    const fontBytes = await fs.readFile('RobotoCondensed-Bold.ttf'); // Provide the path to the Arial font file
    const customFont = await pdfDoc.embedFont(fontBytes);
  
    // Calculate the x position to center the text horizontally
    const textSiriWidth = customFont.widthOfTextAtSize(textSiri, pos.siri.size);
    const textNamaWidth = customFont.widthOfTextAtSize(textNama, pos.nama.size);
    const textSekolahWidth = customFont.widthOfTextAtSize(textSekolah, pos.sekolah.size);
    const textPertandinganWidth = customFont.widthOfTextAtSize(textPertandingan, pos.pertandingan.size);
    const textPeringkat1Width = customFont.widthOfTextAtSize(textPeringkat1, pos.peringkat1.size);
    const textPeringkat2Width = customFont.widthOfTextAtSize(textPeringkat2, pos.peringkat2.size);
    const textTempatWidth = customFont.widthOfTextAtSize(textTempat, pos.tempat.size);
    const textTarikhWidth = customFont.widthOfTextAtSize(textTarikh, pos.tarikh.size);
  
    const cxSiri = (pageWidth - textSiriWidth - 40);
    const cxNama = (pageWidth - textNamaWidth) / 2;
    const cxSekolah = (pageWidth - textSekolahWidth) / 2;
    const cxPertandingan = (pageWidth - textPertandinganWidth) / 2;
    const cxPeringkat1 = (pageWidth - textPeringkat1Width) / 2;
    const cxPeringkat2 = (pageWidth - textPeringkat2Width) / 2;
    const cxTempat = (pageWidth - textTempatWidth) / 2;
    const cxTarikh = (pageWidth - textTarikhWidth) / 2;
    //const centerY = pageHeight / 2;
  
    // Add text in the middle of the page with Arial font
    firstPage.drawText(textSiri, {
      x: cxSiri,
      y: pos.siri.y,
      size: pos.siri.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textNama, {
      x: cxNama,
      y: pos.nama.y,
      size: pos.nama.size,
      font: customFont, // Set the font to Arial
      color: rgb(0.25, 0.4, 0.6), // Black color
    });
  
    firstPage.drawText(textSekolah, {
      x: cxSekolah,
      y: pos.sekolah.y,
      size: pos.sekolah.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textPertandingan, {
      x: cxPertandingan,
      y: pos.pertandingan.y,
      size: pos.pertandingan.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textPeringkat1, {
      x: cxPeringkat1,
      y: pos.peringkat1.y,
      size: pos.peringkat1.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textPeringkat2, {
      x: cxPeringkat2,
      y: pos.peringkat2.y,
      size: pos.peringkat2.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textTempat, {
      x: cxTempat,
      y: pos.tempat.y,
      size: pos.tempat.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    firstPage.drawText(textTarikh, {
      x: cxTarikh,
      y: pos.tarikh.y,
      size: pos.tarikh.size,
      font: customFont, // Set the font to Arial
      color: rgb(0, 0, 0), // Black color
    });
  
    
    const modifiedPdfBytes = await pdfDoc.save();
  
    
    return modifiedPdfBytes;
  }

  async function mergePdfs(dataArray) {
    try {
      const mergedPdf = await PDFDocument.create();
      console.log('<---dataArray--->', dataArray);
    
      for (const data of dataArray) {
        console.log('<---data--->',data);
        const pdfBytes = await createSijil(data);
        //console.log('<---pdfBytes--->', pdfBytes);
  
        const pdfDoc = await PDFDocument.load(pdfBytes);
        //console.log('<---pdfDoc Content--->', pdfDoc.toString());// Log high-level structure of pdfDoc (excluding circular references)
        //console.log('pdfDoc.getPages()===>',pdfDoc.getPages());
  
        //const [pages] = await pdfDoc.copyPages(pdfDoc.getPages(),[0]);
        //console.log('<---pages--->',pages);
        const [page] = await mergedPdf.copyPages(pdfDoc, [0]);
        //pages.forEach((page) => mergedPdf.addPage(page));
        mergedPdf.addPage(page);
      }
      
      const savedPdf = await mergedPdf.save();
      const fname = dataArray[0].kodsekolah + '-' + dataArray[0].siri;
      const folderPath = path.join(`${auth._CERT_}/generated/guru/`);
      await fs.mkdir(folderPath, { recursive: true });
    
      const filePath = path.join(folderPath, `${fname}.pdf`);
      console.log('======>filepath: ',path,filePath);
      await fs.writeFile(filePath, savedPdf);
    
      return savedPdf;
    } catch (error) {
        console.error('Error in PDF generation:', error);
        throw error; // Propagate the error
    }
  }

  module.exports = {createSijil,mergePdfs}