import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

export const generateAllTeamsPDF = async (activeAuction, teams, squads) => {
  if (!activeAuction || !teams || teams.length === 0) {
    alert("No data available to generate PDF.");
    return;
  }

  const doc = new jsPDF();
  const maxBudget = activeAuction?.max_budget || 0;
  
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const squad = squads[team.id] || [];
    
    // Add page if not the first team
    if (i > 0) {
      doc.addPage();
    }

    let startY = 20;

    // Try to load team logo
    let logoLoaded = false;
    if (team.logo_url) {
      try {
        const logoBase64 = await getBase64ImageFromURL(team.logo_url);
        doc.addImage(logoBase64, 'PNG', 14, 15, 20, 20);
        logoLoaded = true;
      } catch (e) {
        console.error(`Failed to load team logo for ${team.team_name}`, e);
      }
    }

    // Header info (Team Name and Stats)
    const textX = logoLoaded ? 38 : 14;
    
    // Draw Auction Title
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139); // Muted Slate
    doc.text(activeAuction?.auction_name?.toUpperCase() || 'AUCTION DETAILS', 14, 12);

    // Draw Team Name
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 54, 93); // Dark Navy/Blue
    doc.text(team.team_name.toUpperCase(), textX, 23);

    // Draw stats line
    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
    const remaining = maxBudget - spent;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    
    const statsText = `Purse Spent: INR ${spent.toLocaleString()}  |  Purse Remaining: INR ${remaining.toLocaleString()}  |  Players: ${squad.length}/${activeAuction?.max_players || 15}`;
    doc.text(statsText, textX, 29);

    // Separator line
    doc.setDrawColor(226, 232, 240); // light gray
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    startY = 44;

    // Filter and Sort players: Icons (Captains) first, then auctioned players sorted by sold price descending
    const icons = squad.filter(p => p.is_icon);
    const auctioned = squad.filter(p => !p.is_icon);
    const sortedAuctioned = [...auctioned].sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0));
    const combinedPlayers = [...icons, ...sortedAuctioned];

    const tableColumn = ["Sr. No.", "Player Name", "Role", "Batting Style", "Bowling Style", "Bid Price", "Designation"];
    
    const tableRows = combinedPlayers.map((p, index) => {
      const playerDetails = p.players || {};
      const fullName = `${playerDetails.first_name || ''} ${playerDetails.last_name || ''}`.trim() || 'Unknown';
      const isIcon = p.is_icon;
      
      return [
        index + 1,
        fullName + (isIcon ? ' (C)' : ''),
        playerDetails.player_role || '-',
        playerDetails.batting_style || '-',
        playerDetails.bowling_style || '-',
        isIcon && !p.sold_price ? 'Icon Player' : `INR ${(p.sold_price || 0).toLocaleString()}`,
        isIcon ? 'Captain' : 'Squad Player'
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [33, 37, 41]
      },
      headStyles: {
        fillColor: [26, 54, 93], // Dark Blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        5: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Highlight the Captain (Icon player)
          const isCaptain = data.row.raw[6] === 'Captain';
          if (isCaptain) {
            data.cell.styles.fillColor = [254, 243, 199]; // soft amber/gold color
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Add footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${pageCount} of ${teams.length}  |  Generated on ${new Date().toLocaleDateString()}`, 14, 285);
  }

  doc.save(`All_Teams_Roster_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`);
};
