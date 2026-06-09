import * as XLSX from "xlsx";

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = (event) => {

      try {

        const data = event.target.result;

        const workbook = XLSX.read(
          data,
          {
            type: "binary",
          }
        );

        const sheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[sheetName];

        const jsonData =
          XLSX.utils.sheet_to_json(
            worksheet
          );

        resolve(jsonData);

      } catch (error) {

        reject(error);

      }

    };

    reader.readAsBinaryString(file);

  });
};